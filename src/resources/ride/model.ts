import mongoose, { Schema } from "mongoose";
import RideInterface from "./interface";

const RideSchema = new Schema({
  vehicle: {
    type: Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: "CustomUser",
    required: true,
  },
  passengers: [
    {
      type: Schema.Types.ObjectId,
      ref: "CustomUser",
    },
  ],
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
  current_location_latitude: {
    type: Number,
    required: false,
  },
  current_location_longitude: {
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
  passenger_distances: {
    type: Map,
    of: Number,
  },
  passenger_fares: {
    type: Map,
    of: Number,
  },
  all_start_latitudes: {
    type: [Number],
    required: true,
  },
  all_start_longitudes: {
    type: [Number],
    required: true,
  },
  all_end_latitudes: {
    type: [Number],
    required: true,
  },
  all_end_longitudes: {
    type: [Number],
    required: true,
  },
  current_passenger_latitude: {
    type: Number,
    required: false,
  },
  current_passenger_longitude: {
    type: Number,
    required: false,
  },
});

RideSchema.set("toJSON", { virtuals: true });

export default mongoose.model<RideInterface>("Ride", RideSchema);
