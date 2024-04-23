import mongoose, { Schema } from "mongoose";
import RideHistoryInterface from "./interface";

const RideHistorySchema: Schema = new Schema({
  ride_id: { type: Schema.Types.ObjectId, ref: "Ride", required: true },
  passenger: { type: Schema.Types.ObjectId, ref: "User", required: true },
  pickup_latitude: { type: Number, required: true },
  pickup_longitude: { type: Number, required: true },
  dropoff_latitude: { type: Number, required: true },
  dropoff_longitude: { type: Number, required: true },
  fare_amount: { type: Number, required: true },
  start_datetime: { type: Date, required: true },
  distance: { type: Number, required: true },
  total_earning: { type: Number, required: false },
  total_expenditure: { type: Number, required: false },
});

RideHistorySchema.set("toJSON", { virtuals: true });

export default mongoose.model<RideHistoryInterface>(
  "RideHistory",
  RideHistorySchema
);
