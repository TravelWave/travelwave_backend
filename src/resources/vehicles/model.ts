import mongoose, { Schema } from "mongoose";
import VehicleInterface from "./interface";

const VehicleSchema = new Schema({
  driver: { type: Schema.Types.ObjectId, ref: "CustomUser", required: true },
  name: { type: String, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  color: { type: String, required: true },
  license_plate: { type: String, required: true },
  number_of_seats: { type: Number, required: true },
  year: { type: Number, required: true },
  is_busy: { type: Boolean, default: false },
  driver_license: { type: String, required: true },
  driver_license_expiration_date: { type: Date, required: true },
  is_verified: { type: Boolean, default: false },
});

VehicleSchema.set("toJSON", { virtuals: true });

export default mongoose.model<VehicleInterface>("Vehicle", VehicleSchema);
