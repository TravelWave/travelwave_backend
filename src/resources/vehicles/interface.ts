import { Document, Types } from "mongoose";
import CustomUserInterface from "../users/interface";

interface VehicleInterface extends Document {
  vehicle_id: Types.ObjectId;
  driver: CustomUserInterface["_id"];
  name: string;
  make: string;
  model: string;
  color: string;
  license_plate: string;
  number_of_seats: number;
  year: number;
  is_busy: boolean;
  driver_license: string;
  driver_license_expiration_date: Date;
  is_verified: boolean;
}

export default VehicleInterface;
