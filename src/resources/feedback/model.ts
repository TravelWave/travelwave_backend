import mongoose, { Schema } from "mongoose";
import FeedbackInterface from "./interface";

const FeedbackSchema = new Schema({
  ride_id: { type: Schema.Types.ObjectId, ref: "Ride", required: true },
  passenger: { type: Schema.Types.ObjectId, ref: "User", required: true },
  driver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true },
  feedback: { type: String, required: true },
});

FeedbackSchema.set("toJSON", { virtuals: true });

export default mongoose.model<FeedbackInterface>("Feedback", FeedbackSchema);
