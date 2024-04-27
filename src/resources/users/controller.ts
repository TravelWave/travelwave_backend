import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CustomError } from "../../middlewares/utils/errorModel";
import CustomUser from "./model";
import CustomUserInterface from "./interface";
import dataAccessLayer from "../../common/dal";
import db from "../../services/db";
import twilio from "twilio";

const UserDAL = dataAccessLayer(CustomUser);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const registerUser = async (req: Request, res: Response) => {
  const session = await db.Connection.startSession();
  try {
    const { full_name, phone_number, is_driver, password } = req.body;

    session.startTransaction();

    if (!full_name || !phone_number || !password) {
      throw new CustomError("Please provide required fields", 400);
    }

    // Check if user exists
    const userExists = await CustomUser.findOne({ phone_number });

    if (userExists) {
      throw new CustomError("User already exists", 400);
    }

    console.log("Phone number:", phone_number);

    // Generate OTP
    const twilioResponse = await twilioClient.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({
        to: phone_number,
        channel: "sms",
      });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await UserDAL.createOne({
      full_name,
      phone_number,
      is_driver,
      password: hashedPassword,
    });

    await session.commitTransaction();
    res.status(201).json(newUser);
    await session.endSession();
  } catch (error) {
    await session.abortTransaction();
    console.error("Error registering user:", error);
    res.status(400).json({ error: "Error registering user" });
  }
};

const resendOTP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await CustomUser.findOne({ id });

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    const phone_number = user.phone_number;

    await twilioClient.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({
        to: phone_number,
        channel: "sms",
      });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phone_number, otp } = req.body;

    console.log("Phone number:", phone_number);
    console.log("OTP:", otp);

    const verifiedResponse = await twilioClient.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verificationChecks.create({
        to: phone_number,
        code: otp,
      });

    console.log("Verified response:", verifiedResponse);

    if (verifiedResponse.status !== "approved") {
      throw new CustomError("Invalid OTP", 400);
    }

    const user = await CustomUser.findOne({ phone_number });

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    user.is_active = true;
    await user.save();

    res.status(200).json({ message: "Phone number verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { phone_number, password } = req.body;

    const user = await CustomUser.findOne({ phone_number });

    if (!user) {
      throw new CustomError("Invalid phone number or password", 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError("Invalid phone number or password", 400);
    }

    if (!user.is_active) {
      throw new CustomError("Please verify your phone number", 400);
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    // Save token to user
    if (!user.token) user.token = token;
    else user.token = token;

    await user.save();

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Internal server error" });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  const session = await db.Connection.startSession();
  try {
    session.startTransaction();
    const user = req.user as CustomUserInterface;

    // Revoke the token from the database using UserDAL
    await UserDAL.updateOne({ token: null }, user._id);

    await session.commitTransaction();
    res.status(200).json({ message: "Successfully logged out" });
    await session.endSession();
  } catch (error) {
    await session.abortTransaction();
    console.error("Error logging out user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const changeUserPassword = async (req: Request, res: Response) => {
  try {
    const { old_password, new_password } = req.body;

    const user = req.user as CustomUserInterface;

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    const realUser = await CustomUser.findOne({ _id: user._id });

    console.log(old_password, new_password, realUser.password);

    const isPasswordValid = await bcrypt.compare(
      old_password,
      realUser.password
    );

    if (!isPasswordValid) {
      throw new CustomError("Invalid old password", 400);
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await UserDAL.updateOne({ password: hashedPassword }, user._id);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing user password:", error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Internal server error" });
  }
};

export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const user = req.user as CustomUserInterface;

    await UserDAL.deleteOne(user._id, false);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserData = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await CustomUser.findOne({ id });

    res.status(200).json(user);
  } catch (error) {
    console.error("Error getting user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  const session = await db.Connection.startSession();
  try {
    // Start a new session for the query
    session.startTransaction();

    // Retrieve all users using UserDAL and pass the session
    const users = await UserDAL.getMany({});

    // Commit the transaction
    await session.commitTransaction();

    res.status(200).json(users);
  } catch (error) {
    // Abort the transaction if an error occurs
    await session.abortTransaction();
    console.error("Error getting all users:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    // End the session
    session.endSession();
  }
};

export default {
  registerUser,
  loginUser,
  logoutUser,
  changeUserPassword,
  deleteUserAccount,
  getUserData,
  getAllUsers,
  resendOTP,
  verifyOTP,
};
