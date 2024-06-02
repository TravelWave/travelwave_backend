import mongoose, { Schema } from "mongoose";
import ConversationInterface from "./conversation.interface";

const ConversationSchema: Schema = new Schema(
	{
		participants: [{ type: Schema.Types.ObjectId, ref: "CustomUser" }],
		messages: [{ type: Schema.Types.ObjectId, ref: "Message", default: [] }],
	},
	{ timestamps: true }
);

export default mongoose.model<ConversationInterface>(
	"Conversation",
	ConversationSchema
);
