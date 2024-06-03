import { Router } from "express";
import { sendMessage, getMessage } from "./controllers";
import { auth } from "../../middlewares/auth";
const router: Router = Router();

router.post("/send/:id", auth, sendMessage);
router.get("/get/:id", auth, getMessage);

export default router;
