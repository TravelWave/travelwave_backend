import { Document } from "mongoose";
import RideInterface from "../ride/interface";

interface InvertedIndexPoolInterface extends Document {
  ride_id: RideInterface["id"];
  nodes: number[][];
}

export default InvertedIndexPoolInterface;
