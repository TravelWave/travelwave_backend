import { Router } from "express";
import rideController from "./controller";

import { auth } from "../../middlewares/auth";

const router: Router = Router();

router.post("/", auth, rideController.createRide);
router.get("/", auth, rideController.getRides);
router.get("/:id", auth, rideController.getRide);
router.put("/:id", auth, rideController.updateRide);
router.delete("/:id", auth, rideController.deleteRide);

export default router;
