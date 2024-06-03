import mongoose, { Schema } from "mongoose";
import MessageInterface from "./message.interface";

const MessageSchema: Schema = new Schema(
	{
		senderId: {
			type: Schema.Types.ObjectId,
			ref: "CustomUser",
			required: true,
		},
		receiverId: {
			type: Schema.Types.ObjectId,
			ref: "CustomUser",
			required: true,
		},
		message: { type: String, required: true },
	},
	{ timestamps: true }
);

export default mongoose.model<MessageInterface>("Message", MessageSchema);
