import { Router } from "express";
import feedbackRoutes from "./controller";

import { auth } from "../../middlewares/auth";

const router: Router = Router();

router.post("/", auth, feedbackRoutes.createFeedback);
router.get("/", auth, feedbackRoutes.getFeedbacks);
router.get("/:id", auth, feedbackRoutes.getFeedback);

export default router;
