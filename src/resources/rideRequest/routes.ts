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
  "/createPooledRideRequest/:id",
  auth,
  rideRequestController.askToJoinPooledRide
);
router.post(
  "/createScheduledPooledRideRequest/:id",
  auth,
  rideRequestController.askToJoinPooledRideScheduled
);
router.get("/", auth, rideRequestController.getRideRequests);
router.get("/pooled", auth, rideRequestController.getPooledRideRequests);
router.get("/scheduled", auth, rideRequestController.getScheduledRideRequests);
router.get(
  "/scheduled/pooled",
  auth,
  rideRequestController.getScheduledPooledRideRequests
);
router.get(
  "/accepted/scheduled",
  auth,
  rideRequestController.getAcceptedScheduledRideRequests
);
router.get(
  "/paginated-ride-requests",
  rideRequestController.paginatedRideRequests
);
router.get("/:id", auth, rideRequestController.getRideRequest);
router.delete("/delete/", rideRequestController.deleteAllRideRequests);
router.put("/:id/accept", auth, rideRequestController.acceptOneRideRequest);
router.put(
  "/:id/accept/scheduled",
  auth,
  rideRequestController.acceptOneScheduledRideRequest
);
router.delete("/:id", auth, rideRequestController.cancelRideRequest);

router.post(
  "/ask-to-join/:id",
  auth,
  rideRequestController.askToJoinPooledRide
);

router.post(
  "/accept-join-request/",
  auth,
  rideRequestController.acceptPooledRideRequest
);
export default router;
