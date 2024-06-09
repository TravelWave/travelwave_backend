import { Request, Response, NextFunction } from "express";
import CustomUser from "../users/model";
import Ride from "../ride/model";
import RideHistory from "../rideHistory/model";
import Vehicle from "../vehicles/model";
import RideRequest from "../rideRequest/model";
import dataAccessLayer from "../../common/dal";

const UserDAL = dataAccessLayer(CustomUser);
const RideDAL = dataAccessLayer(Ride);
const RideHistoryDAL = dataAccessLayer(RideHistory);
const VehicleDAL = dataAccessLayer(Vehicle);
const RideRequestDAL = dataAccessLayer(RideRequest);

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
    const rideRequestsCount = await RideRequestDAL.getMany({});

    // get all drivers and passengers
    const drivers = await UserDAL.getMany({ is_driver: true });
    const passengers = await UserDAL.getMany({ is_driver: false });

    const totalUserCount = usersCount.length;
    const totalRideCount = ridesCount.length;
    const totalRideHistoryCount = rideHistoriesCount.length;
    const totalVehicleCount = vehiclesCount.length;
    const totalRideRequestCount = rideRequestsCount.length;
    const totalDriverCount = drivers.length;
    const totalPassengerCount = passengers.length;

    res.status(200).json({
      totalUserCount,
      totalRideCount,
      totalRideHistoryCount,
      totalVehicleCount,
      totalRideRequestCount,
      totalDriverCount,
      totalPassengerCount,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRideByType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const singleRide = await RideDAL.getMany({
      is_pooled: false,
      is_scheduled: false,
    });
    const oneScheduledRide = await RideDAL.getMany({
      is_pooled: false,
      is_scheduled: true,
    });
    const pooledRide = await RideDAL.getMany({
      is_pooled: true,
      is_scheduled: false,
    });
    const pooledScheduledRide = await RideDAL.getMany({
      is_pooled: true,
      is_scheduled: true,
    });

    const allRides = await RideDAL.getMany({});

    res.status(200).json({
      singleRide: singleRide.length,
      oneScheduledRide: oneScheduledRide.length,
      pooledRide: pooledRide.length,
      pooledScheduledRide: pooledScheduledRide.length,
      totalRideCount: allRides.length,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default { getCounts, getRideByType };
