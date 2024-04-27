import { Request, Response } from "express";
import FeedbackSchema from "./model";
import FeedbackInterface from "./interface";
import RideSchema from "../ride/model";
import VehicleSchema from "../vehicles/model";
import dataAccessLayer from "../../common/dal";

const vehicleDAL = dataAccessLayer(VehicleSchema);
const rideDAL = dataAccessLayer(RideSchema);
const feedbackDAL = dataAccessLayer(FeedbackSchema);

export const createFeedback = async (req: Request, res: Response) => {
  try {
    const feedback: FeedbackInterface = req.body;
    const user = req.user;

    const id = user._id;

    if (user.is_driver) {
      feedback.driver = id;
    } else {
      feedback.passenger = id;
    }

    if (feedback.driver && feedback.passenger) {
      throw new Error(
        "Ride feedback cannot have both driver and passenger IDs"
      );
    } else if (!feedback.driver && !feedback.passenger) {
      throw new Error("Ride feedback must have either driver or passenger");
    }

    const vehicle = await vehicleDAL.getOnePopulated({ driver: id });
    const vehicleId = vehicle._id;

    const ride = await rideDAL.getOnePopulated({ vehicle: vehicleId });
    const rideId = ride._id;

    feedback.ride_id = rideId;
    const createdFeedback = await feedbackDAL.createOne(feedback);
    res.status(201).json(createdFeedback);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getFeedbacks = async (req: Request, res: Response) => {
  try {
    const feedbacks = await feedbackDAL.getMany({});
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getFeedback = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const feedback = await feedbackDAL.getOne({ _id: id });
    res.status(200).json(feedback);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export default {
  createFeedback,
  getFeedbacks,
  getFeedback,
};
