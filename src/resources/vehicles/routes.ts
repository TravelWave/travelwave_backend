import { Router } from "express";
import vehicleController from "./controller";

import { auth } from "../../middlewares/auth";

const router = Router();

router.post("/", auth, vehicleController.createVehicle);
router.get("/", auth, vehicleController.getVehicles);
router.get("/:id", auth, vehicleController.getVehicle);
router.put("/:id", auth, vehicleController.updateVehicle);
router.delete("/:id", auth, vehicleController.deleteVehicle);

export default router;
