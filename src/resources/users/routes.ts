import { Router } from "express";
import userController from "./controller";
import { validateJoi, Schemas } from "../../middlewares/validate";
import { auth } from "../../middlewares/auth";
import { fileUpload } from "../../middlewares/upload-via-stream";

const router = Router();

router.route("/all-passengers").get(userController.getAllPassengers);
router.route("/all-drivers").get(userController.getAllDrivers);
router.route("/paginated-users").get(userController.paginatedUsers);
router.route("/search-users").get(userController.searchUsers);
router.route("/user-credits").get(auth, userController.getUserCredits);
router.route("/user-feedbacks").get(auth, userController.getUserFeedbacks);
router
  .route("/user-ride-histories")
  .get(auth, userController.getUserRideHistories);

router
  .route("/upload-image/:id")
  .post(auth, fileUpload.single("file"), userController.uploadProfileImage);

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
router.route("/login-admin").post(userController.loginAdmin);
router.route("/logout").post(auth, userController.logoutUser);

router.route("/verify").post(userController.verifyOTP);
router.route("/resendOTP/:id").get(userController.resendOTP);

export default router;
