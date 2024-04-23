import { Document } from "mongoose";
import CustomUserInterface from "../users/interface";
import RideInterface from "../ride/interface";

interface RideHistoryInterface extends Document {
  ride_id: RideInterface["_id"]; // Assuming ride_id and passenger are references to documents
  passenger: CustomUserInterface["_id"];
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_latitude: number;
  dropoff_longitude: number;
  fare_amount: number;
  start_datetime: Date;
  distance: number;
  total_earning: number;
  total_expenditure: number;
}

export default RideHistoryInterface;
