import mongoose, { Schema } from "mongoose";
import IUserInterface from "./interface";

enum genderType {
  M = "Male",
  F = "Female",
}

enum roleType {
  Driver = "Driver",
  Passanger = "Passanger",
  Admin = "Admin",
}

const UserSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    DoB: { type: Date, required: false },
    gender: { type: String, enum: genderType, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    profileImage: { type: String },
    role: { type: String, enum: roleType, required: true },
    isActive: { type: Boolean, default: false },
  },

  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.set("toJSON", { virtuals: true });

export default mongoose.model<IUserInterface>("User", UserSchema);
