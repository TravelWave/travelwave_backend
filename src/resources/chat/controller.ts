import ChatSchema from "../chat/model";
import dataAccessLayer from "../../common/dal";

const chatDAL = dataAccessLayer(ChatSchema);

async function handlePrivateMessage(
  senderId: string,
  recipientId: string,
  message: string
) {
  const newMessage = {
    sender: senderId,
    recipient: recipientId,
    message: message,
    status: "delivered",
  };

  const chat = await chatDAL.createOne(newMessage);
  return chat;
}

async function getMessages(senderId: string, recipientId: string) {
  const chats = await ChatSchema.find({
    $or: [
      { sender: senderId, recipient: recipientId },
      { sender: recipientId, recipient: senderId },
    ],
  })
    .populate("sender", "name")
    .populate("recipient", "name")
    .sort({ createdAt: 1 });
  return chats;
}

export default { handlePrivateMessage };
