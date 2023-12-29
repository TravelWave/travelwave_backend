import { Document } from "mongoose";

interface IUserInterface extends Document {
  firstName: String;
  lastName: String;
  email: String;
  password: String;
  DoB: Date;
  gender: String;
  profileImage: String;
  role: String;
  isActive: Boolean;
}

export default IUserInterface;
