import { Router } from "express";

const router: Router = Router();

import userRouter from "../resources/users/routes";
import vehicleRouter from "../resources/vehicles/routes";

router.use("/users", userRouter);
router.use("/vehicles", vehicleRouter);

export default router;
