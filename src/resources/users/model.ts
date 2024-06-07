import mongoose, { Schema } from "mongoose";
import CustomUserInterface from "./interface";

const CustomUserSchema = new Schema({
  full_name: { type: String, required: true },
  phone_number: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  is_staff: { type: Boolean, default: true },
  is_driver: { type: Boolean, default: false },
  rating: { type: Number, default: 5.0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: false },
  profile_picture: { type: String, required: false },
  token: { type: String, required: false },
  otp: { type: String, required: false },
  DoB: { type: Date, required: false },
  gender: { type: String, required: false },
});

CustomUserSchema.virtual("fullName").get(function () {
  return `${this.full_name}`;
});

CustomUserSchema.set("toJSON", { virtuals: true });

export default mongoose.model<CustomUserInterface>(
  "CustomUser",
  CustomUserSchema
);
