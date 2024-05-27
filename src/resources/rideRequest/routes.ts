import { Router } from "express";
import rideRequestController from "./controller";

import { auth } from "../../middlewares/auth";

const router: Router = Router();

router.post(
  "/createOneRideRequest",
  auth,
  rideRequestController.createOneRideRequest
);
router.post(
  "/createOneScheduledRideRequest",
  auth,
  rideRequestController.createOneScheduledRideRequest
);
router.post(
  "/createPooledRideRequest",
  auth,
  rideRequestController.createPooledRideRequest
);
router.post(
  "/createPooledScheduledRideRequest",
  auth,
  rideRequestController.createPooledScheduledRideRequest
);
router.get("/", auth, rideRequestController.getRideRequests);
router.get("/pooled", auth, rideRequestController.getPooledRideRequests);
router.get("/scheduled", auth, rideRequestController.getScheduledRideRequests);
router.get(
  "/scheduled/pooled",
  auth,
  rideRequestController.getScheduledPooledRideRequests
);
router.get("/:id", auth, rideRequestController.getRideRequest);
router.delete("/:id", auth, rideRequestController.cancelRideRequest);
router.put("/:id/accept", auth, rideRequestController.acceptRideRequest);

export default router;
