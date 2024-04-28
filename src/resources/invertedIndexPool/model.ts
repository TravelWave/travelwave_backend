import mongoose, { Schema } from "mongoose";
import InvertedIndexPoolInterface from "./interface";

const InvertedIndexPoolSchema = new Schema({
  ride_id: { type: Schema.Types.ObjectId, ref: "Ride", required: true },
  nodes: { type: [[Number]], required: true },
});

InvertedIndexPoolSchema.set("toJSON", { virtuals: true });

export default mongoose.model<InvertedIndexPoolInterface>(
  "InvertedIndexPool",
  InvertedIndexPoolSchema
);
