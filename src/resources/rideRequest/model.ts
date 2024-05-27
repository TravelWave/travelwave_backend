import mongoose, { Schema } from "mongoose";
import RideRequestInterface from "./interface";

const status = ["pending", "accepted", "rejected"];

const RideRequestSchema = new Schema({
  passenger: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  start_latitude: {
    type: Number,
    required: true,
  },
  start_longitude: {
    type: Number,
    required: true,
  },
  end_latitude: {
    type: Number,
    required: true,
  },
  end_longitude: {
    type: Number,
    required: true,
  },
  request_time: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: status,
  },
  shortest_path: {
    type: String,
    required: true,
  },
  is_pooled: {
    type: Boolean,
    required: true,
  },
  is_scheduled: {
    type: Boolean,
    required: true,
  },
  scheduled_time: {
    type: Date,
  },
});

RideRequestSchema.set("toJSON", { virtuals: true });

export default mongoose.model<RideRequestInterface>(
  "RideRequest",
  RideRequestSchema
);
