import { Document } from "mongoose";
import CustomUserInterface from "../users/interface";

interface RideRequestInterface extends Document {
  passenger: CustomUserInterface["id"];
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  request_time: Date;
  status: string;
  shortest_path: string;
}

export default RideRequestInterface;
