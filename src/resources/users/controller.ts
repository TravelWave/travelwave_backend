import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CustomError } from "../../middlewares/utils/errorModel";
import CustomUser from "./model";
import CustomUserInterface from "./interface";
import Credit from "../credits/model";
import Feedback from "../feedback/model";
import RideHistory from "../rideHistory/model";
import dataAccessLayer from "../../common/dal";
import db from "../../services/db";
import twilio from "twilio";
import { streamUpload } from "../../services/bucket";

const UserDAL = dataAccessLayer(CustomUser);
const CreditDAL = dataAccessLayer(Credit);
const FeedbackDAL = dataAccessLayer(Feedback);
const RideHistoryDAL = dataAccessLayer(RideHistory);

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

    console.log("Twilio response:", twilioResponse);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await UserDAL.createOne({
      full_name,
      phone_number,
      is_driver,
      password: hashedPassword,
    });

    // await session.commitTransaction();
    res.status(201).json(newUser);
    // await session.endSession();
  } catch (error) {
    // await session.abortTransaction();
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

    const twilioResponse = await twilioClient.verify.v2
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

    const payload = {
      userId: user._id,
      full_name: user.full_name,
      phone_number: user.phone_number,
      is_staff: user.is_staff,
      is_driver: user.is_driver,
      rating: user.rating,
      is_active: user.is_active,
      profile_picture: user.profile_picture,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);

    user.token = token;

    await user.save();

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Internal server error" });
  }
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { phone_number, password } = req.body;

    const user = await CustomUser.findOne({ phone_number });

    if (!user) {
      throw new CustomError("Invalid email or password", 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new CustomError("Invalid email or password", 400);
    }

    if (!user.is_staff) {
      throw new CustomError("Unauthorized", 401);
    }

    const payload = {
      userId: user._id,
      full_name: user.full_name,
      is_staff: user.is_staff,
      is_driver: user.is_driver,
      rating: user.rating,
      is_active: user.is_active,
      profile_picture: user.profile_picture,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);

    user.token = token;

    await user.save();

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in admin:", error);
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

export const getAllPassengers = async (req: Request, res: Response) => {
  try {
    // Retrieve all users using UserDAL and pass the session
    const users = await UserDAL.getAllPopulated({ is_driver: false });

    console.log("Users:", users);

    res.status(200).json(users);
  } catch (error) {
    // Abort the transaction if an error occurs
    console.error("Error getting all passengers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    const users = await UserDAL.getAllPopulated({ is_driver: true });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error getting all drivers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    console.log("Query:", query);
    console.log("Params:", req.query);

    const users = await UserDAL.getMany({
      full_name: { $regex: query, $options: "i" },
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const paginatedUsers = async (req: Request, res: Response) => {
  try {
    const { page, limit, type, search } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const searchQuery = search as string;
    const userType = type as string;

    // Define the fields to search on
    const searchFields = ["full_name"];

    // Define the filters based on the userType
    const filters: any = {};
    if (userType === "passenger") {
      filters.is_driver = false;
    } else if (userType === "driver") {
      filters.is_driver = true;
    }

    const users = await UserDAL.getPaginated(
      {},
      {
        page: pageNumber,
        limit: limitNumber,
        search: searchQuery,
        searchFields,
        filters,
      }
    );

    // Count total users, passengers, and drivers
    const totalUsers = await CustomUser.countDocuments({});
    const totalPassengers = await CustomUser.countDocuments({
      is_driver: false,
    });
    const totalDrivers = await CustomUser.countDocuments({ is_driver: true });

    res.status(200).json({
      users,
      total_users: totalUsers,
      total_passengers: totalPassengers,
      total_drivers: totalDrivers,
    });
  } catch (error) {
    console.error("Error paginating users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserCredits = async (req: Request, res: Response) => {
  try {
    const user = req.user as CustomUserInterface;

    const credits = await CreditDAL.getMany({ userId: user._id });

    res.status(200).json(credits);
  } catch (error) {
    console.error("Error getting user credits:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserFeedbacks = async (req: Request, res: Response) => {
  try {
    const user = req.user as CustomUserInterface;

    const feedbacks = await FeedbackDAL.getMany({ driver: user._id });

    res.status(200).json(feedbacks);
  } catch (error) {
    console.error("Error getting user feedbacks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserRideHistories = async (req: Request, res: Response) => {
  try {
    const user = req.user as CustomUserInterface;

    const rideHistories = await RideHistoryDAL.getMany({ user: user._id });

    res.status(200).json(rideHistories);
  } catch (error) {
    console.error("Error getting user ride histories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const uploadProfileImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const currentUser = req.user._id;
  const userId = req.params.id;
  const file = req.file;

  if (currentUser == userId) {
    try {
      // const resultURL = await cloudinaryUpload(file);
      const resultURL = await streamUpload(req, "users");

      console.log("Result URL:", resultURL);

      if (resultURL) {
        const data = await UserDAL.updateOne(
          { profile_picture: resultURL },
          userId
        );

        if (!data) {
          return next(new CustomError("Cannot update User", 400));
        }

        res.status(200).json({ message: "Image upload successful", data });
      } else {
        res.status(400).json({ message: "Error uploading image to storage" });
      }
    } catch (error) {
      next(new CustomError("There was an error uploading", 500));
    }
  } else {
    res.status(401).json({ message: "Not authorized for this operation" });
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
  getAllPassengers,
  getAllDrivers,
  searchUsers,
  paginatedUsers,
  getUserCredits,
  getUserFeedbacks,
  loginAdmin,
  getUserRideHistories,
  uploadProfileImage,
};
