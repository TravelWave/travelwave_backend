import request from "supertest";
import app from "../../src/app";

describe("Admin Controller", () => {
  describe("GET /admin/counts", () => {
    it("should return status code 200 and the counts", async () => {
      const response = await request(app).get("/admin/counts");
      expect(response.statusCode).toBe(200);
      // Assuming the response should have a specific structure, e.g., { users: number, rides: number }
      expect(response.body).toHaveProperty("users");
      expect(response.body).toHaveProperty("rides");
      // Add more assertions as needed based on the expected response structure and data types
    });

    // Add more tests as needed for different scenarios, e.g., unauthorized access, server errors, etc.
  });

  // Add more describe blocks for other endpoints in the admin controller as needed
});
