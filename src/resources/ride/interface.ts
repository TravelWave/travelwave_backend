import { Document } from "mongoose";
import VehicleInterface from "../vehicles/interface";

interface RideInterface extends Document {
  vehicle: VehicleInterface["id"];
  number_of_passengers: number;
  latitude: number;
  longitude: number;
  available_seats: number;
}

export default RideInterface;
