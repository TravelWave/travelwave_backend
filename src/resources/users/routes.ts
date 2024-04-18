import { Router } from "express";
import userController from "./controller";
import { validateJoi, Schemas } from "../../middlewares/validate";
import { auth } from "../../middlewares/auth";
// import { fileUpload } from '../../middlewares/upload-via-stream'

const router = Router();

router
  .route("/")
  .get(auth, userController.getAllUsers)
  .post(validateJoi(Schemas.user.create), userController.registerUser);

// router.route('/new-password').put(userController.resetPassword)
// router.route('/verify/:id/:otp').get(userController.verifyEmail)
router.route("/changePassword").put(auth, userController.changeUserPassword);
// router.route('/validateOtp').post(userController.validateOtp)

// router
//   .route('/upload-image/:id')
//   .post(auth, fileUpload.single('image'), userController.uploadProfileImage)

router
  .route("/:id")
  .get(auth, userController.getUserData)
  //   .put(auth, validateJoi(Schemas.user.create), userController.updateUser)
  .delete(auth, userController.deleteUserAccount);

router.route("/login").post(userController.loginUser);
router.route("/logout").post(auth, userController.logoutUser);
// router.route('/forgetPassword').post(userController.forgetPassword)
// router.route('/resetPassword').post(userController.resetPassword)

export default router;
