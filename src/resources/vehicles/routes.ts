import { Router } from "express";
import vehicleController from "./controller";

import { auth } from "../../middlewares/auth";

const router = Router();

router.post("/", auth, vehicleController.createVehicle);
router.get("/paginated-vehicles", vehicleController.paginatedVehicles);
router.get("/verified-vehicles", vehicleController.getVerifiedVehicles);
router.get("/unverified-vehicles", vehicleController.getUnverifiedVehicles);
router.get(
  "/get-vehicle-by-driver/:driverId",
  vehicleController.getVehicleByDriver
);
router.get("/", auth, vehicleController.getVehicles);
router.get("/:id", auth, vehicleController.getVehicle);
router.put("verify/:id", auth, vehicleController.verifyVehicle);
router.put("/:id", auth, vehicleController.updateVehicle);
router.delete("/:id", auth, vehicleController.deleteVehicle);

export default router;
