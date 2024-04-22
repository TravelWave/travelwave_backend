import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CustomError } from "../../middlewares/utils/errorModel";
import CustomUser from "./model";
import CustomUserInterface from "./interface";
import { generateOTP } from "../../middlewares/utils/otp-gen";
import dataAccessLayer from "../../common/dal";
import db from "../../services/db";
import logger from "../../common/logger";
import twilio from "twilio";
import cron from "node-cron";

const UserDAL = dataAccessLayer(CustomUser);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Register User Controller
export const registerUser = async (req: Request, res: Response) => {
  const session = await db.Connection.startSession();
  try {
    const { full_name, phone_number, is_driver, driver_license, password } =
      req.body;

    session.startTransaction();

    if (!full_name || !phone_number || !password) {
      throw new CustomError("Please provide required fields", 400);
    }

    // Check if user exists
    const userExists = await CustomUser.findOne({ phone_number });

    if (userExists) {
      throw new CustomError("User already exists", 400);
    }

    // Generate OTP
    const otp = generateOTP(6);

    // Schedule task to remove OTP after 1 minute
    cron.schedule(
      `* * * * *`,
      async () => {
        try {
          const user = await CustomUser.findOne({ phone_number });
          if (user && user.otp === otp) {
            user.otp = null;
            await user.save();
            logger.info(`OTP ${otp} removed after 1 minute.`);
          }
        } catch (error) {
          console.error("Error removing OTP:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Africa/Nairobi",
      }
    );

    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your OTP for registration is: ${otp}`,
      to: phone_number, // user's phone number
      from: process.env.TWILIO_PHONE_NUMBER, // Twilio phone number
    });

    // Start the scheduled task
    const task = cron.schedule("* * * * *", () => {
      logger.info("Task executed");
    });
    task.start();

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await UserDAL.createOne({
      full_name,
      phone_number,
      is_driver,
      driver_license,
      password: hashedPassword,
      otp: otp,
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
    const { phone_number } = req.body;

    const user = await CustomUser.findOne({ phone_number });

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Generate OTP
    const otp = generateOTP(6);

    // Schedule task to remove OTP after 1 minute
    cron.schedule(
      `* * * * *`,
      async () => {
        try {
          const user = await CustomUser.findOne({ phone_number });
          if (user && user.otp === otp) {
            user.otp = null;
            await user.save();
            logger.info(`OTP ${otp} removed after 1 minute.`);
          }
        } catch (error) {
          console.error("Error removing OTP:", error);
        }
      },
      { scheduled: true, timezone: "Africa/Nairobi" }
    );

    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your OTP for registration is: ${otp}`,
      to: phone_number, // user's phone number
      from: process.env.TWILIO_PHONE_NUMBER, // Twilio phone number
    });

    user.otp = otp;
    await user.save();

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body;

    const { otp } = req.params;

    const user = await CustomUser.findOne({ phone_number });

    if (!user) {
      throw new CustomError("User not found", 404);
    }
    logger.info(user.otp);
    logger.info(`Real OTP ${otp}`);

    if (user.otp !== otp) {
      throw new CustomError("Invalid OTP", 400);
    }

    user.is_active = true;
    user.otp = null;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
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
    const user = req.user as CustomUserInterface;
    const { old_password, new_password } = req.body;

    const userFromDB = await CustomUser.findOne({ _id: user._id });

    if (!userFromDB) {
      throw new CustomError("User not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(
      old_password,
      userFromDB.password
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

// Delete User Account Controller
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const user = req.user as CustomUserInterface;

    await UserDAL.deleteOne(user._id);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get User Data Controller
export const getUserData = async (req: Request, res: Response) => {
  try {
    const user = req.user as CustomUserInterface;

    res.status(200).json({
      full_name: user.full_name,
      phone_number: user.phone_number,
      is_driver: user.is_driver,
    });
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
