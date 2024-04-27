import { Router } from "express";
import rideHistoryController from "./controller";

import { auth } from "../../middlewares/auth";

const router: Router = Router();

router.post("/", auth, rideHistoryController.createRideHistory);
router.get("/", auth, rideHistoryController.getRideHistories);
router.get("/:id", auth, rideHistoryController.getRideHistory);
router.put("/:id", auth, rideHistoryController.updateRideHistory);
router.delete("/:id", auth, rideHistoryController.deleteRideHistory);
router.get(
  "/user/:userId",
  auth,
  rideHistoryController.getRideHistoriesByUserId
);

export default router;
