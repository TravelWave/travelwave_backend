import { Router } from 'express'
import userController from './controller'
import { validateJoi, Schemas } from '../../middlewares/validate'
import { auth } from '../../middlewares/auth'
// import { fileUpload } from '../../middlewares/upload-via-stream'

const router = Router()

router
  .route('/')
  .get(auth, userController.getAllUser)
  .post(validateJoi(Schemas.user.create), userController.create)

router.route('/me').get(auth, userController.getLoggedUser)
// router.route('/new-password').put(userController.resetPassword)
// router.route('/verify/:id/:otp').get(userController.verifyEmail)
// router.route('/changePassword').put(auth, userController.changePassword)
// router.route('/validateOtp').post(userController.validateOtp)

// router
//   .route('/upload-image/:id')
//   .post(auth, fileUpload.single('image'), userController.uploadProfileImage)

router
  .route('/:id')
  .get(auth, userController.getUser)
  .put(auth, validateJoi(Schemas.user.create), userController.updateUser)
  .delete(auth, userController.deleteUser)

router.route('/login').post(userController.login)
// router.route('/forgetPassword').post(userController.forgetPassword)
// router.route('/resetPassword').post(userController.resetPassword)

export default router