import { Request, Response } from "express";
import VehicleSchema from "./model";
import VehicleInterface from "./interface";
import dataAccessLayer from "../../common/dal";
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 600 });

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

export const verifyVehicle = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const vehicle = await vehicleDAL.updateOne({ is_verified: true }, id);
    res.status(200).json(vehicle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const paginatedVehicles = async (req: Request, res: Response) => {
  try {
    const { page, limit, type, search } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const searchQuery = search as string;
    const userType = type as string;

    // Define the filters based on the userType
    const filters: any = {};
    if (userType === "verified") {
      filters.is_verified = true;
    } else if (userType === "unverified") {
      filters.is_verified = false;
    }

    const populateOpts = [
      {
        path: "driver",
        select:
          "full_name phone_number rating is_driver is_active profile_picture",
      },
    ];

    const vehicles = await vehicleDAL.getPaginated(
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
    const totalUsers = await VehicleSchema.countDocuments({});
    const totalUnverified = await VehicleSchema.countDocuments({
      is_verified: false,
    });
    const totalVerified = await VehicleSchema.countDocuments({
      is_verified: true,
    });

    res.status(200).json({
      vehicles,
      total_users: totalUsers,
      total_unverified: totalUnverified,
      total_verified: totalVerified,
    });
  } catch (error) {
    console.error("Error paginating vehicles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getVerifiedVehicles = async (req: Request, res: Response) => {
  try {
    const vehicles = await vehicleDAL.getMany({ is_verified: true });
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getUnverifiedVehicles = async (req: Request, res: Response) => {
  try {
    const vehicles = await vehicleDAL.getMany({ is_verified: false });
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getVehicleByDriver = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.driverId;
    const vehicles = await vehicleDAL.getMany({ driver: driverId });
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export default {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle,
  verifyVehicle,
  paginatedVehicles,
  getVerifiedVehicles,
  getUnverifiedVehicles,
  getVehicleByDriver,
};
