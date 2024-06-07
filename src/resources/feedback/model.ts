import mongoose, { Schema } from "mongoose";
import FeedbackInterface from "./interface";

const FeedbackSchema = new Schema({
  ride_id: { type: Schema.Types.ObjectId, ref: "Ride", required: true },
  passenger: {
    type: Schema.Types.ObjectId,
    ref: "CustomUser",
    required: false,
  },
  driver: { type: Schema.Types.ObjectId, ref: "CustomUser", required: false },
  rating: { type: Number, required: true },
  feedback: { type: String, required: true },
});

FeedbackSchema.set("toJSON", { virtuals: true });

export default mongoose.model<FeedbackInterface>("Feedback", FeedbackSchema);
