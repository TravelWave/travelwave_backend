import { Document } from "mongoose";

interface CustomUserInterface extends Document {
  full_name: string;
  phone_number: string;
  password: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_driver: boolean;
  rating: number;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  profile_picture?: string;
  token?: string;
  otp?: string;
  DoB?: string;
  gender?: string;
}

export default CustomUserInterface;
