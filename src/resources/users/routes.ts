import { Router } from "express";
import userController from "./controller";
import { validateJoi, Schemas } from "../../middlewares/validate";
import { auth } from "../../middlewares/auth";
// import { fileUpload } from '../../middlewares/upload-via-stream'

const router = Router();

router
  .route("/")
  .get(userController.getAllUsers)
  .post(validateJoi(Schemas.user.create), userController.registerUser);

router.route("/changePassword").put(auth, userController.changeUserPassword);

router
  .route("/:id")
  .get(userController.getUserData)
  .delete(auth, userController.deleteUserAccount);

router.route("/login").post(userController.loginUser);
router.route("/logout").post(auth, userController.logoutUser);

router.route("/verify").post(userController.verifyOTP);
router.route("/resendOTP/:id").get(userController.resendOTP);

export default router;
