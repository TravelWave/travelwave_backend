import supertest from "supertest";
import app from "../../src/app";

const request = supertest(app);

jest.setTimeout(3000);

jest.mock("../../src/socket", () => ({
  io: require("./__mocks__/socket.io").default,
}));

describe("Test app.ts", () => {
  test("Health-check should be working", async () => {
    const res = await request.get("/");
    expect(res.body).toEqual({
      "health-check": "OK: top level api working",
    });
  });

  test("random url test should throw 404", async () => {
    const res = await request.get("/random");
    expect(res.status).toEqual(404);
  });
});
