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
  sendRideRequestAcceptedNotification,
} from "../../services/notificationService";
import { oneRideFarePriceCalculator } from "../../services/priceCalculationService";
import {
  checkDirection,
  decodePolyline,
  calculateDetourDistance,
} from "../../services/rideShareUtils";
import { calculateDistance } from "../../services/priceCalculationService";
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 600 });

const rideRequestDAL = dataAccessLayer(RideRequest);
const vehicleDAL = dataAccessLayer(VehicleSchema);
const rideDAL = dataAccessLayer(RideSchema);

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
        driver,
        `New ride request from ${user.full_name}`
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

    const ride = await rideDAL.getOnePopulated({ vehicle: car._id });

    if (!ride) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Ride not found" });
    }

    console.log(ride);

    const driverLocation = [ride.latitude, ride.longitude];

    // Fetch passenger's location
    const passenger = await rideRequestDAL.getOne({ _id: id });
    if (!passenger) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Passenger not found" });
    }

    console.log(ride.passengers, rideRequest.passenger);

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

    const passengerLocation = [
      passenger.start_latitude,
      passenger.start_longitude,
    ];

    // Calculate ETA and fare in parallel
    const [eta, fare] = await Promise.all([
      calculateETA(driverLocation, passengerLocation),
      oneRideFarePriceCalculator(rideRequest.shortest_path),
    ]);

    // Send notification to the user
    await sendRideRequestAcceptedNotification(
      rideRequest.passenger,
      `${carInfo} ETA: ${eta}`,
      fare
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

    res.status(200).json(updatedRideRequest);
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

export const createPooledRideRequest = (req: Request, res: Response) => {
  createRideRequestHelper(req, res, false, true);
};

export const createPooledScheduledRideRequest = (
  req: Request,
  res: Response
) => {
  createRideRequestHelper(req, res, true, true);
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
    const rideRequest = await rideRequestDAL.deleteOne(id, true);
    res.status(200).json(rideRequest);
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

export const askToJoinPooledRide = async (req: Request, res: Response) => {
  try {
    const rideId = req.params.id;

    // Fetch the ride details
    const ride = await rideDAL.getOnePopulated({ _id: rideId });

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const passengerRequest = req.body;

    const newPassengerStartLocation = [
      passengerRequest.start_latitude,
      passengerRequest.start_longitude,
    ];
    const newPassengerEndLocation = [
      passengerRequest.end_latitude,
      passengerRequest.end_longitude,
    ];

    const existingRoute = decodePolyline(ride.shortest_path);
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

    // check for remaining seats
    if (ride.available_seats === 0) {
      return res.status(400).json({ message: "No available seats" });
    }

    // Calculate the detour distance for the driver
    const detourDistance = await calculateDetourDistance(
      existingRoute,
      newPassengerStartLocation,
      newPassengerEndLocation
    );

    // calculate the total distance the user would travel if accepted in to the ride
    const totalDistance = calculateDistance(existingRoute);

    // Send a notification to the driver about the new join request
    await sendRideRequestNotification(
      ride.driver,
      `New join request from ${req.user.full_name}. Detour distance: ${detourDistance}`
    );

    res.status(200).json({
      message: "Join request sent to the driver",
      detourDistance: detourDistance,
      rideId: rideId,
      passengerId: req.user._id,
      totalDistance: totalDistance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// a function for accepting a passanger to join the pooled ride
export const acceptPooledRideRequest = async (req: Request, res: Response) => {
  const session = await db.Connection.startSession();
  session.startTransaction();

  try {
    const data = req.body;

    const rideId = data.rideId;
    const passengerId = data.passengerId;
    const totalDistance = data.totalDistance;

    // Fetch the ride details
    const ride = await rideDAL.getOnePopulated({ _id: rideId });

    if (!ride) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Ride not found" });
    }

    // check if the passanger is already in the ride
    if (ride.passengers.includes(passengerId)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Passenger is already in the ride" });
    }

    ride.passengers.push(passengerId);
    ride.passengerDistances[passengerId] = totalDistance;

    const totalRideDistance: any = Object.values(
      ride.passengerDistances
    ).reduce((acc: number, distance: number) => acc + distance, 0);

    ride.passengerFares = {};

    for (const [id, dist] of Object.entries(ride.passengerDistances)) {
      const passengerDistance: any = dist;
      const rideDistance: number = totalRideDistance;
      ride.passengerFares[id] =
        (passengerDistance / rideDistance) * ride.totalPrice;
    }
    await rideDAL.updateOne(ride, ride._id);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Passenger added to the ride" });
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

    const rideRequests = await rideRequestDAL.getPaginated(
      {},
      {
        page: pageNumber,
        limit: limitNumber,
        search: searchQuery,
        searchFields: [],
        filters,
      }
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
  createPooledRideRequest,
  createPooledScheduledRideRequest,
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
};
