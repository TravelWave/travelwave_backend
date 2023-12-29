import { Document } from "mongoose";
import IUserInterface from "../users/interface";

interface IOptUserInterface extends Document {
  user: IUserInterface["_id"];
  otp: String;
}

export default IOptUserInterface;
