import mongoose, { Schema } from "mongoose";
import IOptUserInterface from "./interface";

const OtpUserSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  otp: {
    type: String,
    required: true,
  },

  expiresAt: {
    type: Date,
    default: Date.now,
    index: {
      expireAfterSeconds: 3600,
    },
  },
});

export default mongoose.model<IOptUserInterface>("OtpUser", OtpUserSchema);
