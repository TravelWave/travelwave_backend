// __tests__/feedbackController.test.ts

import supertest from "supertest";
import mongoose from "mongoose";
import app from "../../src/app";
import FeedbackModel from "../../src/resources/feedback/model";
import RideModel from "../../src/resources/ride/model";
import VehicleModel from "../../src/resources/vehicles/model";

// Mock the user authentication middleware
jest.mock("../../src/middlewares/auth", () => (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId(), is_driver: true };
  next();
});

// Mock the data access layer
jest.mock("../../src/common/dal");

const request = supertest(app);

describe("Feedback Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /v1/feedback", () => {
    it("should return all feedbacks", async () => {
      (FeedbackModel.find as jest.Mock).mockResolvedValueOnce([
        // Provide mock feedback data here
      ]);

      const response = await request.get("/v1/feedback");

      expect(response.status).toBe(200);
      // Add more assertions as needed
    });
  });

  describe("GET /v1/feedback/:id", () => {
    it("should return feedback by id", async () => {
      const feedbackId = new mongoose.Types.ObjectId();

      (FeedbackModel.findOne as jest.Mock).mockResolvedValueOnce({
        _id: feedbackId,
        // Provide mock feedback data here
      });

      const response = await request.get(`/v1/feedback/${feedbackId}`);

      expect(response.status).toBe(200);
      // Add more assertions as needed
    });
  });
});
