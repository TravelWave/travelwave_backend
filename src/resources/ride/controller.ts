import { Request, Response } from "express";
import RideSchema from "./model";
import RideInterface from "./interface";
import VehicleSchema from "../vehicles/model";
import InvertedIndexPool from "../invertedIndexPool/model";
import dataAccessLayer from "../../common/dal";
import logger from "../../common/logger";

const rideDAL = dataAccessLayer(RideSchema);
const vehicleDAL = dataAccessLayer(VehicleSchema);
const invertedIndexPoolDAL = dataAccessLayer(InvertedIndexPool);

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

export const createRide = async (req: Request, res: Response) => {
  try {
    const ride: RideInterface = req.body;
    const user = req.user;

    const id = user._id;

    const vehicle = await vehicleDAL.getOnePopulated({ driver: id });

    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    ride.vehicle = vehicle.id;

    // Fetch route from graphhopper
    const origin = [ride.latitude, ride.longitude];
    const destination = [ride.destination_latitude, ride.destination_longitude];
    const shortest_path = await fetchRoute(origin, destination);
    ride.shortest_path = shortest_path;

    var nodes = [];

    if (ride.shortest_path) {
      nodes = decodePolyline(ride.shortest_path);
    } else {
      nodes = [[ride.latitude, ride.longitude]];
    }
    const createdRide = await rideDAL.createOne(ride);

    logger.info("Ride created successfully");

    // get ride by id
    const ridev2 = await rideDAL.getOne({ _id: createdRide._id });

    console.log("ride", ridev2._id);

    const invertedIndexPool = {
      ride_id: ridev2._id,
      nodes,
    };

    await invertedIndexPoolDAL.createOne(invertedIndexPool);

    logger.info("Inverted Index Pool created successfully");

    res.status(201).json(createdRide);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
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

export default {
  createRide,
  getRides,
  getRide,
  updateRide,
  deleteRide,
};
