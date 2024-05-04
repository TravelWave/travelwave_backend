import { Router } from "express";
import rideRequestController from "./controller";

import { auth } from "../../middlewares/auth";

const router: Router = Router();

router.post("/", auth, rideRequestController.createRideRequest);
router.get("/", auth, rideRequestController.getRideRequests);
router.get("/:id", auth, rideRequestController.getRideRequest);
router.delete("/:id", auth, rideRequestController.cancelRideRequest);
router.put("/:id/accept", auth, rideRequestController.acceptRideRequest);

export default router;
