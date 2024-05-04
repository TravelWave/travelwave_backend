import { Request, Response } from "express";
import RideRequest from "./model";
import RideRequestInterface from "./interface";
import VehicleSchema from "../vehicles/model";
import RideSchema from "../ride/model";
import dataAccessLayer from "../../common/dal";
import {
  findNearbyDrivers,
  calculateETA,
} from "../../services/driverLocationService";
import {
  sendRideRequestNotification,
  sendRideRequestAcceptedNotification,
} from "../../services/notificationService";
import { oneRideFarePriceCalculator } from "../../services/priceCalculationService";

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

export const createRideRequest = async (req: Request, res: Response) => {
  try {
    const rideRequest: RideRequestInterface = req.body;
    const user = req.user;

    const id = user._id;

    rideRequest.passenger = id;

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

export const cancelRideRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const rideRequest = await rideRequestDAL.deleteOne(id, true);
    res.status(200).json(rideRequest);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const acceptRideRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const driverId = req.user._id;

    const rideRequest = await rideRequestDAL.getOnePopulated({ _id: id });

    if (!rideRequest || rideRequest.status !== "pending") {
      return res
        .status(404)
        .json({ message: "Ride request not found or not in pending state" });
    }

    rideRequest.status = "accepted";
    rideRequest.driver = driverId;

    const updatedRideRequest = await rideRequestDAL.updateOne(rideRequest, id);

    // Get the driver's location
    const car = await vehicleDAL.getOnePopulated({ driver: driverId });
    const carInfo = `A ${car.name}, ${car.make} ${car.model} color ${car.color} with license plate ${car.license_plate} is on the way to pick you up.`;

    const ride = await rideDAL.getOnePopulated({ vehicle: car._id });

    const driverLocation = [ride.latitude, ride.longitude];

    // Get the passenger's location
    const passenger = await rideRequestDAL.getOne({ _id: id });
    const passengerLocation = [
      passenger.start_latitude,
      passenger.start_longitude,
    ];

    console.log("Driver Location", driverLocation);
    console.log("Passenger Location", passengerLocation);

    // Calculate the ETA
    const eta = await calculateETA(driverLocation, passengerLocation);

    // calculate the fare price
    const fare = oneRideFarePriceCalculator(rideRequest.shortest_path);

    // Send notification to the user
    await sendRideRequestAcceptedNotification(
      rideRequest.passenger,
      `${carInfo} ETA: ${eta}`,
      fare
    );

    // update the ride
    ride.number_of_passengers += 1;
    ride.available_seats -= 1;
    ride.destination_latitude = passenger.end_latitude;
    ride.destination_longitude = passenger.end_longitude;
    ride.shortest_path = rideRequest.shortest_path;

    await rideDAL.updateOne(ride, ride._id);

    res.status(200).json(updatedRideRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  createRideRequest,
  getRideRequests,
  getRideRequest,
  cancelRideRequest,
  acceptRideRequest,
};
