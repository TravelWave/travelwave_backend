import { Router } from "express";

const router: Router = Router();

import userRouter from "../resources/users/routes";
import vehicleRouter from "../resources/vehicles/routes";
import rideRouter from "../resources/ride/routes";
import rideHistoryRouter from "../resources/rideHistory/routes";
import feedbackRouter from "../resources/feedback/routes";

router.use("/users", userRouter);
router.use("/vehicles", vehicleRouter);
router.use("/rides", rideRouter);
router.use("/ride-histories", rideHistoryRouter);
router.use("/feedbacks", feedbackRouter);

export default router;
