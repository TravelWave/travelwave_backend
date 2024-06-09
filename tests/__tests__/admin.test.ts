import request from "supertest";
import app from "../../src/app";

describe("Admin Controller", () => {
  describe("GET /admin/counts", () => {
    it("should return status code 200 and the counts", async () => {
      const response = await request(app).get("/admin/counts");
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("users");
      expect(response.body).toHaveProperty("rides");
    });
  });
});
