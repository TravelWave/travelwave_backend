import { Router } from "express";

const router: Router = Router();

import userRouter from "../resources/users/routes";
import vehicleRouter from "../resources/vehicles/routes";
import rideRouter from "../resources/ride/routes";
import rideHistoryRouter from "../resources/rideHistory/routes";
import feedbackRouter from "../resources/feedback/routes";
import rideRequestRouter from "../resources/rideRequest/routes";
import messagesRoutes from "../resources/chat/routes";
import creditsRouter from "../resources/credits/routes";
import adminRouter from "../resources/admin/routes";

router.use("/users", userRouter);
router.use("/vehicles", vehicleRouter);
router.use("/rides", rideRouter);
router.use("/ride-histories", rideHistoryRouter);
router.use("/feedbacks", feedbackRouter);
router.use("/ride-requests", rideRequestRouter);
router.use("/messages", messagesRoutes);
router.use("/credits", creditsRouter);
router.use("/admin", adminRouter);

export default router;
