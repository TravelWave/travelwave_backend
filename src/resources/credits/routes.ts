import { Router } from "express";
import creditsController from "./controller";
import { auth } from "../../middlewares/auth";

const router = Router();

router
  .route("/create-credit-on-sign-up")
  .post(creditsController.createCreditOnSignUp);

router
  .route("/normal-ride")
  .post(auth, creditsController.updateCreditsForNormalRide);

router
  .route("/pooled-ride")
  .post(auth, creditsController.updateCreditsForPooledRide);

router.route("/:userId").get(auth, creditsController.getUserCredits);

export default router;
