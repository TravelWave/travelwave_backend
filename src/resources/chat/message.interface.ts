import { Document } from "mongoose";
import CustomUserInterface from "../users/interface";

interface MessageInterface extends Document {
	sender: CustomUserInterface["_id"];
	receiver: CustomUserInterface["_id"];
	message: string;
}

export default MessageInterface;
