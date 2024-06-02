import { Document } from "mongoose";
import CustomUserInterface from "../users/interface";

interface Credits extends Document {
  userId: CustomUserInterface["_id"];
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

export default Credits;
