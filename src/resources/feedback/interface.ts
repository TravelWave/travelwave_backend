import { Document } from "mongoose";
import CustomUserInterface from "../users/interface";
import RideInterface from "../ride/interface";

interface FeedbackInterface extends Document {
  ride_id: RideInterface["_id"]; // Assuming ride_id, passenger, and driver are references to documents
  passenger: CustomUserInterface["_id"];
  driver: CustomUserInterface["_id"];
  rating: number;
  feedback: string;
}

export default FeedbackInterface;
