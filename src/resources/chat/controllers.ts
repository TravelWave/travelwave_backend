import { Request, Response } from "express";
import conversationModel from "./conversation.model";
import messageModel from "./message.model";

import { io } from "../../socket";

export const getMessage = async (req: Request, res: Response) => {
	try {
		const { id: userToChatId } = req.params;
		const senderId = req.user._id;

		const conversations = await conversationModel
			.findOne({
				participants: { $all: [senderId, userToChatId] },
			})
			.populate({
				path: "messages",
				populate: {
					path: "senderId receiverId",
					select: "full_name is_driver ",
				},
			});

		if (!conversations) return res.status(200).json([]);

		const messages = conversations.messages;
		res.status(200).json(messages);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const sendMessage = async (req: Request, res: Response) => {
	try {
		const { message } = req.body;
		const { id: receiverId } = req.params;
		const senderId = req.user._id;

		let conversations = await conversationModel.findOne({
			participants: { $all: [senderId, receiverId] },
		});

		if (!conversations) {
			conversations = await conversationModel.create({
				participants: [senderId, receiverId],
			});
		}

		const newMessage = new messageModel({
			senderId,
			receiverId,
			message,
		});

		if (newMessage) {
			conversations.messages.push(newMessage._id);
		}

		// this will run in parallel
		await Promise.all([conversations.save(), newMessage.save()]);

		const populatedMessage = await messageModel
			.findById(newMessage._id)
			.populate({
				path: "senderId receiverId",
				select: "full_name is_driver ",
			});

		io.to(receiverId).emit("new message", populatedMessage);

		io.to(senderId.toString()).emit("new message", populatedMessage);

		res.status(201).json(populatedMessage);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
