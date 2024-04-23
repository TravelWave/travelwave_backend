import mongoose, { Schema } from "mongoose";
import ChatInterface from "./interface";

const ChatSchema: Schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  status: { type: String, required: true },
  edited: { type: Boolean, required: true },
});

ChatSchema.set("timestamps", true);
ChatSchema.set("toJSON", { virtuals: true });

export default mongoose.model<ChatInterface>("Chat", ChatSchema);
