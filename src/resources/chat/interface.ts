import { Document } from "mongoose";
import CustomUserInterface from "../users/interface";

interface ChatInterface extends Document {
  sender: CustomUserInterface["_id"];
  receiver: CustomUserInterface["_id"];
  message: string;
  status: "sent" | "in progress" | "failed";
  edited: boolean;
}

export default ChatInterface;
