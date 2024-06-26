import { Request, Response } from "express";
import RideSchema from "./model";
import RideInterface from "./interface";
import VehicleSchema from "../vehicles/model";
import db from "../../services/db";
import RideHistory from "../rideHistory/model";
import dataAccessLayer from "../../common/dal";
import logger from "../../common/logger";
import { sendDestinationReachedNotification } from "../../services/notificationService";

const rideDAL = dataAccessLayer(RideSchema);
const vehicleDAL = dataAccessLayer(VehicleSchema);
const rideHistoryDAL = dataAccessLayer(RideHistory);

function decodePolyline(encoded: string) {
  const poly = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    const latlng = [lat * 1e-5, lng * 1e-5];
    poly.push(latlng);
  }
  return poly;
}

async function fetchRoute(origin: number[], destination: number[]) {
  const response = await fetch(
    `https://graphhopper.com/api/1/route?point=${origin[0]},${origin[1]}&point=${destination[0]},${destination[1]}&key=${process.env.GRAPH_HOPPER_API_KEY}`
  );
  const data = await response.json();
  if (data.paths && data.paths.length > 0) {
    const encodedPoints = data.paths[0].points;
    return encodedPoints;
  }
  return null;
}

async function getVehicleForUser(userId: string) {
  const vehicle = await vehicleDAL.getOnePopulated({ driver: userId });
  if (!vehicle) {
    throw new Error("Vehicle not found");
  }
  return vehicle;
}

async function createRide(
  req: Request,
  res: Response,
  isScheduled: boolean,
  isPooled: boolean
) {
  const session = await db.Connection.startSession();

  try {
    session.startTransaction();
    const ride: RideInterface = req.body;
    const user = req.user;
    const vehicle = await getVehicleForUser(user._id);

    if (vehicle.is_verified === false) {
      throw new Error("Vehicle is not verified");
    }

    ride.vehicle = vehicle.id;
    ride.is_scheduled = isScheduled;
    ride.is_pooled = isPooled;

    // get the driver
    ride.driver = user._id;

    ride.current_location_latitude = ride.latitude;
    ride.current_location_longitude = ride.longitude;

    // Fetch route from graphhopper
    const origin = [ride.latitude, ride.longitude];
    const destination = [ride.destination_latitude, ride.destination_longitude];
    const shortest_path = await fetchRoute(origin, destination);
    ride.shortest_path = shortest_path;

    let nodes = [];
    if (ride.shortest_path) {
      nodes = decodePolyline(ride.shortest_path);
    } else {
      nodes = [[ride.latitude, ride.longitude]];
    }

    const createdRide = await rideDAL.createOne(ride);
    logger.info("Ride created successfully");

    // Get ride by id
    const ridev2 = await rideDAL.getOne({ _id: createdRide._id });
    console.log("ride", ridev2._id);

    await session.commitTransaction();
    res.status(201).json(createdRide);
    await session.endSession();
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  }
}

export const createOneRide = (req: Request, res: Response) => {
  createRide(req, res, false, false);
};

export const createOneScheduledRide = (req: Request, res: Response) => {
  createRide(req, res, true, false);
};

export const createPooledRide = (req: Request, res: Response) => {
  createRide(req, res, false, true);
};

export const createScheduledPooledRide = (req: Request, res: Response) => {
  createRide(req, res, true, true);
};

export const getRides = async (req: Request, res: Response) => {
  try {
    const rides = await rideDAL.getMany({});
    res.status(200).json(rides);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const ride = await rideDAL.getOne({ _id: id });
    res.status(200).json(ride);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getPooledRides = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;

    const rides = await rideDAL.getAllPopulated({ is_pooled: true });

    // show only rides that are within 1km of the user
    const nearbyRides = rides.filter((ride) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        ride.latitude,
        ride.longitude
      );

      return distance <= 1000;
    });

    // get the vehicle details
    for (let i = 0; i < nearbyRides.length; i++) {
      const vehicle = await vehicleDAL.getOnePopulated({
        _id: nearbyRides[i].vehicle,
      });
      nearbyRides[i].vehicle = vehicle;
    }

    res.status(200).json(nearbyRides);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getScheduledRides = async (req: Request, res: Response) => {
  try {
    const rides = await rideDAL.getAllPopulated({ is_scheduled: true });

    for (let i = 0; i < rides.length; i++) {
      const vehicle = await vehicleDAL.getOnePopulated({
        _id: rides[i].vehicle,
      });
      rides[i].vehicle = vehicle;
    }
    res.status(200).json(rides);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getScheduledPooledRides = async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;

  try {
    const rides = await rideDAL.getAllPopulated({
      is_scheduled: true,
      is_pooled: true,
    });

    // show only rides that are within 1km of the user
    const nearbyRides = rides.filter((ride) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        ride.latitude,
        ride.longitude
      );

      return distance <= 1000;
    });

    // get the vehicle details
    for (let i = 0; i < nearbyRides.length; i++) {
      const vehicle = await vehicleDAL.getOnePopulated({
        _id: nearbyRides[i].vehicle,
      });
      nearbyRides[i].vehicle = vehicle;
    }

    res.status(200).json(nearbyRides);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const updateRide = async (req: Request, res: Response) => {
  try {
    const ride: RideInterface = req.body;
    const id = req.params.id;
    const updatedRide = await rideDAL.updateOne(ride, id);
    res.status(200).json(updatedRide);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRide = async (req: Request, res: Response) => {
  try {
    await rideDAL.deleteOne(req.params.id, true);
    res.status(200).json({ message: "Ride deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const paginatedRides = async (req: Request, res: Response) => {
  try {
    const { page, limit, type, search } = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const rideType = (type as string) || "";
    const searchQuery = (search as string) || "";

    // Define the filters based on the ride type
    const filters: any = {};
    if (rideType === "pooled") {
      filters.is_pooled = true;
    } else if (rideType === "scheduled") {
      filters.is_scheduled = true;
    }

    const populateOpts = [
      {
        path: "driver",
        select:
          "full_name phone_number rating is_driver is_active profile_picture created_at updated_at",
      },
      {
        path: "passengers",
        select:
          "full_name phone_number rating is_passenger is_active profile_picture created_at updated_at",
      },
    ];

    const rides = await rideDAL.getPaginated(
      {},
      {
        page: pageNumber,
        limit: limitNumber,
        search: searchQuery,
        searchFields: [],
        filters,
      },
      populateOpts
    );

    // Count total rides, pooled rides, and scheduled rides
    const totalRides = await RideSchema.countDocuments({});
    const totalPooled = await RideSchema.countDocuments({ is_pooled: true });
    const totalScheduled = await RideSchema.countDocuments({
      is_scheduled: true,
    });

    res.status(200).json({
      rides,
      total_rides: totalRides,
      total_pooled: totalPooled,
      total_scheduled: totalScheduled,
    });
  } catch (error) {
    console.error("Error paginating rides:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// test endpoint not for production
// remove all passengers from all rides
export const removeAllPassengers = async (req: Request, res: Response) => {
  try {
    await RideSchema.updateMany(
      {},
      {
        passengers: [],
        number_of_passengers: 0,
        available_seats: 5,
        passenger_distances: [],
        passenger_fares: [],
        all_start_latitudes: [],
        all_start_longitudes: [],
        all_end_latitudes: [],
        all_end_longitudes: [],
      }
    );
    res.status(200).json({ message: "Passengers removed from all rides" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// remove with a specific ID
export const removePassenger = async (req: Request, res: Response) => {
  try {
    const rideId = req.body.ride_id;
    const userId = req.body.user_id;

    const ride = await rideDAL.getOne({ _id: rideId });

    if (!ride) {
      throw new Error("Ride not found");
    }

    const passengers = ride.passengers;
    const index = passengers.indexOf(userId);

    if (index > -1) {
      passengers.splice(index, 1);
    }

    const updatedRide = await RideSchema.findByIdAndUpdate(
      rideId,
      {
        passengers,
        number_of_passengers: passengers.length,
        available_seats: ride.available_seats + 1,
      },
      { new: true }
    );

    res.status(200).json(updatedRide);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;

  const R = 6371e3; // Earth radius in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

export const trackDriverLocation = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const rideId = req.params.id;

    const ride = await rideDAL.getOne({ _id: rideId });

    if (!ride) {
      throw new Error("Ride not found");
    }

    const destinationLatitude = ride.destination_latitude;
    const destinationLongitude = ride.destination_longitude;

    // Check if the destination coordinates are defined
    let message = "";
    if (destinationLatitude && destinationLongitude) {
      const distanceToDestination = calculateDistance(
        latitude,
        longitude,
        destinationLatitude,
        destinationLongitude
      );

      const threshold = 100; // Define a threshold distance in meters
      if (distanceToDestination <= threshold) {
        message = "You might have reached your destination.";
        sendDestinationReachedNotification(message);
      }
    }

    const updatedRide = await RideSchema.findByIdAndUpdate(
      rideId,
      {
        current_location_latitude: latitude,
        current_location_longitude: longitude,
      },
      { new: true }
    );

    res.status(200).json({
      ride: updatedRide,
      message,
    });
  } catch (error) {
    console.error("Error tracking driver location:", error);
    res.status(400).json({ message: error.message });
  }
};

// end ride
export const endRide = async (req: Request, res: Response) => {
  try {
    const rideId = req.params.id;
    const ride = await rideDAL.getOne({ _id: rideId });

    if (!ride) {
      throw new Error("Ride not found");
    }

    let totalProfitForRide = 0;

    // calculate the total profit for the ride
    for (const fare of Object.values(ride.passenger_fares)) {
      totalProfitForRide += fare as number;
    }

    // show the fares for each passenger
    const passengerFares = Object.entries(ride.passenger_fares);
    passengerFares.forEach(([passengerId, fare], index) => {
      console.log(ride.passenger_distances);
      // populate ride history
      const rideHistory = {
        ride_id: ride._id,
        passenger: passengerId, // using passengerId directly
        driver: ride.driver,
        fare_amount: fare,
        pickup_latitude: ride.latitude,
        pickup_longitude: ride.longitude,
        dropoff_latitude: ride.destination_latitude,
        dropoff_longitude: ride.destination_longitude,
        distance: ride.passenger_distances[passengerId],
        total_earning: totalProfitForRide,
        total_expenditure: fare,
      };

      rideHistoryDAL.createOne(rideHistory);
    });

    // delete the ride
    await rideDAL.deleteOne(rideId, true);

    res.status(200).json({ message: "Ride ended successfully" });
  } catch (error) {
    console.error("Error ending ride:", error);
    res.status(400).json({ message: error.message });
  }
};

export default {
  createOneRide,
  createOneScheduledRide,
  createPooledRide,
  createScheduledPooledRide,
  getRides,
  getRide,
  getPooledRides,
  getScheduledRides,
  getScheduledPooledRides,
  updateRide,
  deleteRide,
  paginatedRides,
  removeAllPassengers,
  removePassenger,
  trackDriverLocation,
  endRide,
};
