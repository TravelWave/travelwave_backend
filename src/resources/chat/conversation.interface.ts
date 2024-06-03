import { Document } from "mongoose";

interface ConversationInterface extends Document {
	participants: string[];
	messages: string[];
}

export default ConversationInterface;
