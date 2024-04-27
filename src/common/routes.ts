import { Router } from "express";

const router: Router = Router();

import userRouter from "../resources/users/routes";
import vehicleRouter from "../resources/vehicles/routes";
import rideRouter from "../resources/ride/routes";

router.use("/users", userRouter);
router.use("/vehicles", vehicleRouter);
router.use("/rides", rideRouter);

export default router;
