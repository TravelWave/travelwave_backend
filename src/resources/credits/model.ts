import mongoose, { Schema } from "mongoose";
import CreditInterface from "./interface";

const CreditSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "CustomUser", required: true },
  credits: { type: Number, required: true },
});

CreditSchema.set("toJSON", { virtuals: true });

export default mongoose.model<CreditInterface>("Credit", CreditSchema);
