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
  destination_latitude: {
    type: Number,
    required: false,
  },
  destination_longitude: {
    type: Number,
    required: false,
  },
  available_seats: {
    type: Number,
    required: true,
  },
  shortest_path: {
    type: String,
    required: false,
  },
  is_pooled: {
    type: Boolean,
    required: true,
  },
  is_scheduled: {
    type: Boolean,
    required: true,
  },
});

RideSchema.set("toJSON", { virtuals: true });

export default mongoose.model<RideInterface>("Ride", RideSchema);
