import supertest from "supertest";
import app from "../../src/app";

const request = supertest(app);

jest.setTimeout(30000);

jest.mock("../../src/socket", () => ({
  io: require("./__mocks__/socket.io").default,
}));

afterAll((done) => {
  done();
});

describe("Admin Controller", () => {
  it("should return counts for users, rides, vehicles, etc.", async () => {
    const response = await request.get("/v1/admin/counts");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("totalUserCount");
    expect(response.body).toHaveProperty("totalRideCount");
    expect(response.body).toHaveProperty("totalRideHistoryCount");
    expect(response.body).toHaveProperty("totalVehicleCount");
    expect(response.body).toHaveProperty("totalRideRequestCount");
    expect(response.body).toHaveProperty("totalDriverCount");
    expect(response.body).toHaveProperty("totalPassengerCount");
  });

  it("should return counts for rides by type", async () => {
    const response = await request.get("/v1/admin/rides");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("singleRide");
    expect(response.body).toHaveProperty("oneScheduledRide");
    expect(response.body).toHaveProperty("pooledRide");
    expect(response.body).toHaveProperty("pooledScheduledRide");
    expect(response.body).toHaveProperty("totalRideCount");
  });
});
