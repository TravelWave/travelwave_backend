import { Router } from "express";
import rideController from "./controller";

import { auth } from "../../middlewares/auth";

const router: Router = Router();

router.post("/createOneRide", auth, rideController.createOneRide);
router.post(
  "/createOneScheduledRide",
  auth,
  rideController.createOneScheduledRide
);
router.post("/createPooledRide", auth, rideController.createPooledRide);
router.post(
  "/createScheduledPooledRide",
  auth,
  rideController.createScheduledPooledRide
);
router.post("/pooled", auth, rideController.getPooledRides);
router.post("/scheduled/pooled", auth, rideController.getScheduledPooledRides);
router.get("/", auth, rideController.getRides);
router.get("/scheduled", auth, rideController.getScheduledRides);
router.get("/paginated-rides", rideController.paginatedRides);
router.get("/:id", auth, rideController.getRide);
router.put("/remove-all-passengers/", rideController.removeAllPassengers);
router.put("/remove-passenger/", rideController.removePassenger);
router.put("/track-driver-location/:id", rideController.trackDriverLocation);
router.put("/end-ride/:id", rideController.endRide);
router.put("/:id", auth, rideController.updateRide);
router.delete("/:id", auth, rideController.deleteRide);

export default router;
