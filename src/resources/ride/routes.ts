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
router.get("/", auth, rideController.getRides);
router.get("/pooled", auth, rideController.getPooledRides);
router.get("/scheduled", auth, rideController.getScheduledRides);
router.get("/scheduled/pooled", auth, rideController.getScheduledPooledRides);
router.get("/:id", auth, rideController.getRide);
router.put("/:id", auth, rideController.updateRide);
router.delete("/:id", auth, rideController.deleteRide);

export default router;
