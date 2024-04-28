import { Document } from "mongoose";
import VehicleInterface from "../vehicles/interface";

interface RideInterface extends Document {
  vehicle: VehicleInterface["id"];
  number_of_passengers: number;
  latitude: number;
  longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  available_seats: number;
  shortest_path?: string;
}

export default RideInterface;
