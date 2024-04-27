import mongoose, { Schema } from "mongoose";
import RideInterface from "./interface";

const RideSchema = new Schema({
  vehicle: {
    type: Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },
  number_of_passengers: {
    type: Number,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  available_seats: {
    type: Number,
    required: true,
  },
});

RideSchema.set("toJSON", { virtuals: true });

export default mongoose.model<RideInterface>("Ride", RideSchema);
