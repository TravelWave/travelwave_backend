import { Request, Response } from "express";
import RideSchema from "./model";
import RideInterface from "./interface";
import VehicleSchema from "../vehicles/model";
import dataAccessLayer from "../../common/dal";

const rideDAL = dataAccessLayer(RideSchema);
const vehicleDAL = dataAccessLayer(VehicleSchema);

export const createRide = async (req: Request, res: Response) => {
  try {
    const ride: RideInterface = req.body;
    const user = req.user;

    const id = user._id;

    const vehicle = await vehicleDAL.getOnePopulated({ driver: id });
    console.log("vehicle", vehicle);

    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    ride.vehicle = vehicle.id;
    console.log("ride", ride);

    const createdRide = await rideDAL.createOne(ride);
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
