import { Request, Response } from "express";
import RideRequest from "./model";
import RideRequestInterface from "./interface";
import VehicleSchema from "../vehicles/model";
import RideSchema from "../ride/model";
import dataAccessLayer from "../../common/dal";
import db from "../../services/db";
import {
  findNearbyDrivers,
  calculateETA,
} from "../../services/driverLocationService";
import {
  sendRideRequestNotification,
  sendRideRequestNotification1,
  sendRideRequestAcceptedNotification,
  sendRideRequestCancelledNotification,
  sendRideRequestAcceptedNotificationPooled,
} from "../../services/notificationService";
import {
  checkDirection,
  decodePolyline,
  calculateDetourDistance,
} from "../../services/rideShareUtils";

const rideRequestDAL = dataAccessLayer(RideRequest);
const vehicleDAL = dataAccessLayer(VehicleSchema);
const rideDAL = dataAccessLayer(RideSchema);

function isWithinBoundingBox(lat, lon, north, south, east, west) {
  const isLatWithin = lat >= south && lat <= north;
  const isLonWithin = lon >= west && lon <= east;

  return isLatWithin && isLonWithin;
}

const calculateDistance1 = (lat1, lon1, lat2, lon2) => {
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

async function createRideRequestHelper(
  req: Request,
  res: Response,
  isScheduled: boolean,
  isPooled: boolean
) {
  try {
    const rideRequest: RideRequestInterface = req.body;
    const user = req.user;

    rideRequest.passenger = user._id;
    rideRequest.request_time = new Date();
    rideRequest.is_scheduled = isScheduled;
    rideRequest.is_pooled = isPooled;

    if (isScheduled) {
      rideRequest.scheduled_time = new Date(rideRequest.scheduled_time);
    }

    const origin = [rideRequest.start_latitude, rideRequest.start_longitude];
    const destination = [rideRequest.end_latitude, rideRequest.end_longitude];

    const shortestPath = await fetchRoute(origin, destination);
    if (!shortestPath) {
      throw new Error("No path found");
    }

    rideRequest.shortest_path = shortestPath;
    rideRequest.status = "pending";

    const createdRideRequest = await rideRequestDAL.createOne(rideRequest);

    const nearbyDrivers = await findNearbyDrivers(origin);
    for (const driver of nearbyDrivers) {
      await sendRideRequestNotification(
        createdRideRequest._id,
        user._id,
        `New ride request from ${user.full_name}`,
        createdRideRequest.is_pooled,
        createdRideRequest.is_scheduled
      );
    }

    res.status(201).json(createdRideRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

const processOneRideRequest = async (
  req: Request,
  res: Response,
  scheduled: boolean
) => {
  const session = await db.Connection.startSession();
  session.startTransaction();
  try {
    const id = req.params.id;
    const driverId = req.user._id;

    // Fetch rideRequest and car data in parallel
    const [rideRequest, car] = await Promise.all([
      rideRequestDAL.getOnePopulated({ _id: id }),
      vehicleDAL.getOnePopulated({ driver: driverId }),
    ]);

    if (!rideRequest || rideRequest.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ message: "Ride request not found or not in pending state" });
    }

    if (!car) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Driver not found" });
    }

    const carInfo = scheduled
      ? `A ${car.name}, ${car.make} ${car.model} color ${car.color} with license plate ${car.license_plate} will pick you up at ${rideRequest.scheduled_time}.`
      : `A ${car.name}, ${car.make} ${car.model} color ${car.color} with license plate ${car.license_plate} is on the way to pick you up.`;

    // Fetch the ride details
    const ride = await rideDAL.getOnePopulated({ vehicle: car._id });

    if (!ride) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Ride not found" });
    }

    // Fetch driver's location
    const driverLocation = [ride.latitude, ride.longitude];

    // Fetch passenger's location
    const passenger = await rideRequestDAL.getOne({ _id: id });
    if (!passenger) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Passenger not found" });
    }

    // check if the passanger is already in the ride
    if (ride.passengers.includes(rideRequest.passenger)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Passenger is already in the ride" });
    }

    // check if the ride has available seats
    if (ride.available_seats === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "No available seats" });
    }
    ride.passengers.push(rideRequest.passenger);

    const calculatedDistance = calculateDistance1(
      rideRequest.start_latitude,
      rideRequest.start_longitude,
      rideRequest.end_latitude,
      rideRequest.end_longitude
    );

    // convert to kilometers
    const calculatedDistance1 = calculatedDistance / 1000;

    ride.passenger_distances = {
      [rideRequest.passenger]: calculatedDistance1,
    };

    ride.passenger_fares = {
      [rideRequest.passenger]: calculatedDistance1 * 10,
    };

    ride.all_start_latitudes.push(rideRequest.start_latitude);
    ride.all_start_longitudes.push(rideRequest.start_longitude);
    ride.all_end_latitudes.push(rideRequest.end_latitude);
    ride.all_end_longitudes.push(rideRequest.end_longitude);

    const passengerLocation = [
      passenger.start_latitude,
      passenger.start_longitude,
    ];

    // Calculate ETA and fare in parallel
    const [eta, fare] = await Promise.all([
      calculateETA(driverLocation, passengerLocation),
      calculatedDistance1 * 10,
    ]);

    // Send notification to the user
    await sendRideRequestAcceptedNotification(
      car.driver,
      carInfo,
      fare,
      ride._id,
      eta,
      calculateDistance1(
        ride.latitude,
        ride.longitude,
        passenger.start_latitude,
        passenger.start_longitude
      ),
      rideRequest._id
    );

    // Update the ride and ride request within the transaction
    ride.number_of_passengers += 1;
    ride.available_seats -= 1;
    ride.destination_latitude = passenger.end_latitude;
    ride.destination_longitude = passenger.end_longitude;
    ride.shortest_path = rideRequest.shortest_path;

    await rideDAL.updateOne(ride, ride._id);

    rideRequest.status = "accepted";
    rideRequest.driver = driverId;

    const updatedRideRequest = await rideRequestDAL.updateOne(rideRequest, id);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ ride: ride._id, updatedRideRequest });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

export const createOneRideRequest = (req: Request, res: Response) => {
  createRideRequestHelper(req, res, false, false);
};

export const createOneScheduledRideRequest = (req: Request, res: Response) => {
  createRideRequestHelper(req, res, true, false);
};

export const getRideRequests = async (req: Request, res: Response) => {
  try {
    const rideRequests = await rideRequestDAL.getMany({});
    res.status(200).json(rideRequests);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getRideRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const rideRequest = await rideRequestDAL.getOne({ _id: id });
    res.status(200).json(rideRequest);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getPooledRideRequests = async (req: Request, res: Response) => {
  try {
    const rideRequests = await rideRequestDAL.getAllPopulated({
      is_pooled: true,
    });
    res.status(200).json(rideRequests);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getScheduledRideRequests = async (req: Request, res: Response) => {
  try {
    const rideRequests = await rideRequestDAL.getAllPopulated({
      is_scheduled: true,
    });
    res.status(200).json(rideRequests);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getScheduledPooledRideRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const rideRequests = await rideRequestDAL.getAllPopulated({
      is_scheduled: true,
      is_pooled: true,
    });
    res.status(200).json(rideRequests);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const cancelRideRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const reason = req.body.reason;

    const rideRequest = await rideRequestDAL.getOnePopulated({ _id: id });
    sendRideRequestCancelledNotification(rideRequest.passenger, reason);

    const response = await rideRequestDAL.deleteOne(id, true);

    res.status(200).json(response);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const deleteAllRideRequests = async (req: Request, res: Response) => {
  try {
    const response = await RideRequest.deleteMany({});
    res.status(200).json(response);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getAcceptedScheduledRideRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const rideRequests = await rideRequestDAL.getAllPopulated({
      is_scheduled: true,
      status: "accepted",
    });
    res.status(200).json(rideRequests);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const acceptOneRideRequest = async (req: Request, res: Response) => {
  processOneRideRequest(req, res, false);
};

export const acceptOneScheduledRideRequest = async (
  req: Request,
  res: Response
) => {
  processOneRideRequest(req, res, true);
};

// Helper function to handle common logic
const processPooledRideRequest = async (
  req: Request,
  res: Response,
  isScheduled: boolean
) => {
  try {
    const rideId = req.params.id;
    const user = req.user;

    // Fetch the ride details
    const ride = await rideDAL.getOnePopulated({ _id: rideId });

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const passengerRequest = req.body;
    console.log("Passenger request:", passengerRequest);

    const newPassengerStartLocation = [
      passengerRequest.start_latitude,
      passengerRequest.start_longitude,
    ];
    const newPassengerEndLocation = [
      passengerRequest.end_latitude,
      passengerRequest.end_longitude,
    ];

    const passengerShortestPath = await fetchRoute(
      newPassengerStartLocation,
      newPassengerEndLocation
    );

    const existingRoute = decodePolyline(passengerShortestPath);
    const isSameDirection = checkDirection(
      existingRoute,
      newPassengerStartLocation,
      newPassengerEndLocation
    );

    if (!isSameDirection) {
      return res
        .status(400)
        .json({ message: "The ride is not in the same direction" });
    }

    // Check for remaining seats
    if (ride.available_seats === 0) {
      return res.status(400).json({ message: "No available seats" });
    }

    // Calculate the detour distance for the driver
    const detourDistance = await calculateDetourDistance(
      existingRoute,
      newPassengerStartLocation,
      newPassengerEndLocation
    );

    // Calculate the total distance the user would travel if accepted into the ride
    const totalDistance = calculateDistance2(
      ride.latitude,
      ride.longitude,
      passengerRequest.end_latitude,
      passengerRequest.end_longitude
    );

    // Send a notification to the driver about the new join request
    await sendRideRequestNotification1(
      ride._id,
      user._id,
      `New join request from ${req.user.full_name}. Detour distance: ${detourDistance}`,
      true,
      isScheduled
    );

    // Create a new ride request object
    const newRideRequest: any = {
      passenger: user._id,
      start_latitude: passengerRequest.start_latitude,
      start_longitude: passengerRequest.start_longitude,
      end_latitude: passengerRequest.end_latitude,
      end_longitude: passengerRequest.end_longitude,
      is_pooled: true,
      is_scheduled: isScheduled,
      request_time: new Date(),
      shortest_path: passengerShortestPath,
      status: "pending",
    };

    if (isScheduled) {
      newRideRequest.scheduled_time = new Date(passengerRequest.scheduled_time);
    }

    await rideRequestDAL.createOne(newRideRequest);

    res.status(200).json({
      message: "Join request sent to the driver",
      detourDistance: detourDistance,
      rideId: rideId,
      driverId: ride.driver,
      totalDistance: totalDistance,
      passengerId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const askToJoinPooledRide = async (req: Request, res: Response) => {
  await processPooledRideRequest(req, res, false);
};

export const askToJoinPooledRideScheduled = async (
  req: Request,
  res: Response
) => {
  await processPooledRideRequest(req, res, true);
};

const calculateDistance2 = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  // Validate inputs to ensure they are numbers and within valid ranges
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number"
  ) {
    throw new Error("Invalid input: All inputs must be numbers.");
  }

  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error("Invalid input: Inputs must not be NaN.");
  }

  if (
    lat1 < -90 ||
    lat1 > 90 ||
    lat2 < -90 ||
    lat2 > 90 ||
    lon1 < -180 ||
    lon1 > 180 ||
    lon2 < -180 ||
    lon2 > 180
  ) {
    throw new Error(
      "Invalid input: Latitude must be between -90 and 90, and longitude between -180 and 180."
    );
  }

  // Radius of the Earth in km
  const R = 6371;

  // Convert degrees to radians
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  // Apply Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in km

  return distance;
};

export const acceptPooledRideRequest = async (req: Request, res: Response) => {
  const session = await db.Connection.startSession();
  session.startTransaction();

  try {
    const data = req.body;

    const rideId = data.rideId;
    const passengerId = data.passengerId;

    // get the ride request details using the user ID
    const rideRequest = await rideRequestDAL.getOnePopulated({
      passenger: passengerId,
    });

    if (!rideRequest) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Ride request not found" });
    }
    const passengerStartLat = rideRequest.start_latitude;
    const passengerStartLon = rideRequest.start_longitude;
    const passengerEndLat = rideRequest.end_latitude;
    const passengerEndLon = rideRequest.end_longitude;

    rideRequest.status = "accepted";

    // Save the updated ride request details
    await rideRequestDAL.updateOne(rideRequest, rideRequest._id);

    // Fetch the ride details
    const ride = await rideDAL.getOnePopulated({ _id: rideId });

    if (!ride) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check if the passenger is already in the ride
    if (ride.passengers.includes(passengerId)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Passenger is already in the ride" });
    }

    // Update ride details with new passenger information
    ride.passengers.push(passengerId);

    if (!ride.passenger_distances) {
      ride.passenger_distances = new Map();
    }
    if (!ride.passenger_fares) {
      ride.passenger_fares = new Map();
    }

    const passengerDistanceValue = calculateDistance2(
      passengerStartLat,
      passengerStartLon,
      passengerEndLat,
      passengerEndLon
    );

    // Set the distance for the passenger
    ride.passenger_distances.set(passengerId, passengerDistanceValue);

    // Add the new passenger's start and end points
    ride.all_start_latitudes.push(passengerStartLat);
    ride.all_start_longitudes.push(passengerStartLon);
    ride.all_end_latitudes.push(passengerEndLat);
    ride.all_end_longitudes.push(passengerEndLon);

    // Calculate the earliest start and latest end points
    const earliestStartLat = Math.min(...ride.all_start_latitudes);
    const earliestStartLon = Math.min(...ride.all_start_longitudes);
    const latestEndLat = Math.max(...ride.all_end_latitudes);
    const latestEndLon = Math.max(...ride.all_end_longitudes);

    const currentFarthestEndLat = Math.max(ride.end_latitude, latestEndLat);
    const currentFarthestEndLon = Math.max(ride.end_longitude, latestEndLon);

    if (
      currentFarthestEndLat !== ride.end_latitude ||
      currentFarthestEndLon !== ride.end_longitude
    ) {
      ride.end_latitude = currentFarthestEndLat;
      ride.end_longitude = currentFarthestEndLon;
    }

    // compute shortest path
    const origin = [earliestStartLat, earliestStartLon];
    const destination = [latestEndLat, latestEndLon];

    const shortestPath = await fetchRoute(origin, destination);
    if (!shortestPath) {
      throw new Error("No path found");
    }

    ride.shortest_path = shortestPath;

    // Calculate the total ride distance
    const totalRideDistance = calculateDistance2(
      earliestStartLat,
      earliestStartLon,
      latestEndLat,
      latestEndLon
    );

    console.log("Total ride distance:", totalRideDistance * 10);
    console.log("passenger distance:", ride.passenger_distances);

    var aggDistance = 0;
    ride.passenger_distances.forEach((distance: number) => {
      aggDistance += distance;
    });

    // Recalculate fares for all passengers
    ride.passenger_distances.forEach((distance: number, id) => {
      ride.passenger_fares.set(
        id,
        (distance / aggDistance) * totalRideDistance * 10
      );
    });

    console.log("passenger distance2:", ride.passenger_fares);

    ride.number_of_passengers += 1;
    ride.available_seats -= 1;

    // Calculate the detour distance for the driver
    const passengerDetourDistance = calculateDistance2(
      ride.latitude,
      ride.longitude,
      passengerStartLat,
      passengerStartLon
    );

    const papassengerDetourDistance1 = calculateDistance1(
      ride.latitude,
      ride.longitude,
      passengerStartLat,
      passengerStartLon
    );

    console.log(
      "Detour distance:",
      passengerDetourDistance,
      papassengerDetourDistance1
    );
    // send a notification to the driver about the new passenger and the detour distance
    await sendRideRequestAcceptedNotificationPooled(
      passengerId,
      "You have accepted the ride request",
      rideId,
      passengerDetourDistance,
      ride.driver,
      rideRequest._id
    );

    ride.destination_latitude = rideRequest.end_latitude;
    ride.destination_longitude = rideRequest.end_longitude;

    // Save the updated ride details
    await rideDAL.updateOne(ride, ride._id);

    await session.commitTransaction();
    res.status(200).json({
      message: "Passenger added to the ride",
      ride: {
        ...ride.toObject(), // Convert to plain object
        passenger_distances: Array.from(ride.passenger_distances.entries()), // Convert Map to array
        passenger_fares: Array.from(ride.passenger_fares.entries()), // Convert Map to array
      },
    });
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

export const paginatedRideRequests = async (req: Request, res: Response) => {
  try {
    const { page, limit, type, search } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const rideType = type as string;
    const searchQuery = search as string;

    // Define the filters based on the userType
    const filters: any = {};
    if (rideType === "pooled") {
      filters.is_pooled = true;
    } else if (rideType === "scheduled") {
      filters.is_scheduled = true;
    }

    const populateOpts = [
      {
        path: "passenger",
        select:
          "full_name phone_number rating is_driver is_active profile_picture",
      },
    ];

    const rideRequests = await rideRequestDAL.getPaginated(
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

    // Count total users, passengers, and drivers
    const totalRides = await RideRequest.countDocuments({});
    const totalPooled = await RideRequest.countDocuments({
      is_pooled: true,
    });
    const totalScheduled = await RideRequest.countDocuments({
      is_scheduled: true,
    });

    res.status(200).json({
      rideRequests,
      total_ride_requests: totalRides,
      total_pooled: totalPooled,
      total_scheduled: totalScheduled,
    });
  } catch (error) {
    console.error("Error paginating ride requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export default {
  createOneRideRequest,
  createOneScheduledRideRequest,
  getRideRequests,
  getRideRequest,
  getPooledRideRequests,
  getScheduledRideRequests,
  getScheduledPooledRideRequests,
  getAcceptedScheduledRideRequests,
  cancelRideRequest,
  acceptOneRideRequest,
  acceptOneScheduledRideRequest,
  acceptPooledRideRequest,
  askToJoinPooledRide,
  paginatedRideRequests,
  deleteAllRideRequests,
  askToJoinPooledRideScheduled,
};
