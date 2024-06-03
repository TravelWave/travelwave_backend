import { Document } from "mongoose";
import VehicleInterface from "../vehicles/interface";
import CustomUserInterface from "../users/interface";

interface RideInterface extends Document {
  vehicle: VehicleInterface["id"];
  driver: CustomUserInterface["id"];
  passengers: CustomUserInterface["id"][];
  number_of_passengers: number;
  latitude: number;
  longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  current_location_latitude: number;
  current_location_longitude: number;
  available_seats: number;
  shortest_path?: string;
  is_pooled: boolean;
  is_scheduled: boolean;
}

export default RideInterface;
