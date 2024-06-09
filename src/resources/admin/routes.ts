import { Router } from "express";
import adminController from "./controller";

const router = Router();

router.get("/counts", adminController.getCounts);
router.get("/rides", adminController.getRideByType);

export default router;
