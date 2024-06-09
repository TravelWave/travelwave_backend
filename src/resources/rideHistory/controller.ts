import { Request, Response } from "express";
import RideHistorySchema from "./model";
import RideHistoryInterface from "./interface";
import VehicleSchema from "../vehicles/model";
import RideSchema from "../ride/model";
import dataAccessLayer from "../../common/dal";

const vehicleDAL = dataAccessLayer(VehicleSchema);
const rideHistoryDAL = dataAccessLayer(RideHistorySchema);
const rideDAL = dataAccessLayer(RideSchema);

export const createRideHistory = async (req: Request, res: Response) => {
  try {
    const rideHistory: RideHistoryInterface = req.body;
    const user = req.user;

    const id = user._id;

    if (user.is_driver) {
      rideHistory.driver = id;
      rideHistory.total_earning = rideHistory.fare_amount;
      rideHistory.total_expenditure = 0;
    } else {
      rideHistory.passenger = id;
      rideHistory.total_earning = 0;
      rideHistory.total_expenditure = rideHistory.fare_amount;
    }

    if (rideHistory.driver && rideHistory.passenger) {
      throw new Error("Ride history must have either driver or passenger");
    } else if (!rideHistory.driver && !rideHistory.passenger) {
      throw new Error("Ride history must have either driver or passenger");
    }

    console.log("here");
    const vehicle = await vehicleDAL.getOnePopulated({ driver: id });
    const vehicleId = vehicle._id;

    console.log("vehicle", vehicle);
    const ride = await rideDAL.getOnePopulated({ vehicle: vehicleId });
    const rideId = ride._id;

    console.log("ride", ride);

    rideHistory.ride_id = rideId;

    const createdRideHistory = await rideHistoryDAL.createOne(rideHistory);
    res.status(201).json(createdRideHistory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRideHistories = async (req: Request, res: Response) => {
  try {
    const rideHistories = await rideHistoryDAL.getMany({});
    res.status(200).json(rideHistories);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getRideHistory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const rideHistory = await rideHistoryDAL.getOne({ _id: id });
    res.status(200).json(rideHistory);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const updateRideHistory = async (req: Request, res: Response) => {
  try {
    const rideHistory: RideHistoryInterface = req.body;
    const id = req.params.id;
    const updatedRideHistory = await rideHistoryDAL.updateOne(rideHistory, id);
    res.status(200).json(updatedRideHistory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRideHistory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await rideHistoryDAL.deleteOne(id, true);
    res.status(204).json();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRideHistoriesByUserId = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const rideHistories = await rideHistoryDAL.getMany({ userId });
    res.status(200).json(rideHistories);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const paginatedRideHistories = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const rideHistories = await rideHistoryDAL.getPaginated(
      {},
      {
        page,
        limit,
        search: (req.query.search as string) || "",
        searchFields: [],
        filters: {},
      }
    );

    res.status(200).json(rideHistories);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export default {
  createRideHistory,
  getRideHistories,
  getRideHistory,
  updateRideHistory,
  deleteRideHistory,
  getRideHistoriesByUserId,
  paginatedRideHistories,
};
