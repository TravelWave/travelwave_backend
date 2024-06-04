import { Request, Response, NextFunction } from "express";
import CustomUser from "../users/model";
import Ride from "../ride/model";
import RideHistory from "../rideHistory/model";
import Vehicle from "../vehicles/model";
import dataAccessLayer from "../../common/dal";

const UserDAL = dataAccessLayer(CustomUser);
const RideDAL = dataAccessLayer(Ride);
const RideHistoryDAL = dataAccessLayer(RideHistory);
const VehicleDAL = dataAccessLayer(Vehicle);

export const getCounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const usersCount = await UserDAL.getMany({});
    const ridesCount = await RideDAL.getMany({});
    const rideHistoriesCount = await RideHistoryDAL.getMany({});
    const vehiclesCount = await VehicleDAL.getMany({});

    const totalUserCount = usersCount.length;
    const totalRideCount = ridesCount.length;
    const totalRideHistoryCount = rideHistoriesCount.length;
    const totalVehicleCount = vehiclesCount.length;

    res.status(200).json({
      totalUserCount,
      totalRideCount,
      totalRideHistoryCount,
      totalVehicleCount,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default { getCounts };
