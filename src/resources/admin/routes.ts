import { Router } from "express";
import adminController from "./controller";

const router = Router();

router.get("/counts", adminController.getCounts);

export default router;
