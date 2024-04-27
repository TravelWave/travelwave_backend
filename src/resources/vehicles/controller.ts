import { Request, Response } from "express";
import VehicleSchema from "./model";
import VehicleInterface from "./interface";
import dataAccessLayer from "../../common/dal";

const vehicleDAL = dataAccessLayer(VehicleSchema);

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const vehicle: VehicleInterface = req.body;
    const user = req.user;

    const id = user._id;

    vehicle.driver = id;
    const createdVehicle = await vehicleDAL.createOne(vehicle);
    res.status(201).json(createdVehicle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getVehicles = async (req: Request, res: Response) => {
  try {
    const vehicles = await vehicleDAL.getMany({});
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getVehicle = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const vehicle = await vehicleDAL.getOne({ _id: id });
    res.status(200).json(vehicle);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const vehicle: VehicleInterface = req.body;
    const id = req.params.id;
    const updatedVehicle = await vehicleDAL.updateOne(vehicle, id);
    res.status(200).json(updatedVehicle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    await vehicleDAL.deleteOne(req.params.id, true);
    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle,
};
