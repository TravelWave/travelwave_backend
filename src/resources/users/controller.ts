import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { encryptId, decryptId } from "../../middlewares/utils/id-encrypt";
import dataAccessLayer from "../../common/dal";
import { CustomError } from "../../middlewares/utils/errorModel";
import User from "./model";
import db from "../../services/db";
import { generateOTP } from "../../middlewares/utils/otp-gen";
import { sendMail } from "../../services/mail";
import OtpUser from "../otp-user/model";
import { streamUpload } from "../../services/bucket";

const UserDAL = dataAccessLayer(User);
const OTPDal = dataAccessLayer(OtpUser);

const create = async (req: Request, res: Response, next: NextFunction) => {
  const { address, ...newUser } = req.body;
  const emailExist = await UserDAL.getOne({ email: newUser.email });

  if (!emailExist) {
    const session = await db.Connection.startSession();

    try {
      session.startTransaction();

      const lastName =
        newUser.lastName.charAt(0).toUpperCase() +
        newUser.lastName.slice(1).toLowerCase();
      const firstName =
        newUser.firstName.charAt(0).toUpperCase() +
        newUser.firstName.slice(1).toLowerCase();
      newUser.lastName = lastName;
      newUser.firstName = firstName;

      const randomSalt = bcrypt.genSaltSync(12);

      let identifier = `${firstName}.${randomSalt}`;

      newUser.password = bcrypt.hashSync(newUser.password, 12);
      newUser.profileImage = `https://avatars.dicebear.com/api/initials/${newUser.firstName}_${newUser.lastName}.png`;
      newUser.identifier = identifier;
      newUser.isActive = false;

      const createdUser = await UserDAL.createWithTransaction(newUser, session);
      const newUserOtp = await OTPDal.createWithTransaction(
        { user: createdUser[0]._id, otp: generateOTP(6) },
        session
      );
      const encrptedUserId = encryptId(createdUser[0]._id);

      const credentials = {
        intent: "Verify Email",
        link: ``,
        to: newUser.email,
        proc: "Verify Email",
        extra: "Generated link expires within an hour",
      };

      if (!(await sendMail(credentials)))
        return res
          .status(404)
          .json(new CustomError("Server Error, please try again later", 404));

      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ message: "user created" });
    } catch {
      session.abortTransaction();
      return res.status(400).json({ message: "Task failed" });
    }
  } else {
    return res
      .status(409)
      .json(new CustomError("That email is taken. Try another", 409));
  }
};

// const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
//   const userId = decryptId(req.params.id);
//   const userOtp = req.params.otp;

//   const registeredOTP = await OTPDal.getOne({ id: userId, otp: userOtp });
//   if (!registeredOTP)
//     return res
//       .status(401)
//       .json(
//         new CustomError(
//           "Email Verification Failed or Email already verified",
//           400
//         )
//       );

//   await UserDAL.updateOne({ isActive: true }, userId);
//   OTPDal.deleteOne(registeredOTP._id, true, { otp: userOtp });
//   res.writeHead(302, {
//     location: "",
//   });
//   res.end();
// };

const login = (req: Request, res: Response, next: NextFunction) => {
  let { email, password } = req.body;

  UserDAL.getOne({ email: email }, "address")
    .then((user: any) => {
      if (user && !user.isActive)
        throw new CustomError(
          "Account is not activated, please verify your email or reset paswword",
          401
        );

      if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign(
          { sub: user._id, role: user.role },
          process.env.JWT_SECRET
        );
        const { password, ...userWithoutPassword } = user;

        res.status(200).json({
          ...userWithoutPassword,
          token,
        });
      } else throw new CustomError("Wrong username or password", 401);
    })
    .catch((err) => {
      next(err);
    });
};

const getAllUser = (req: Request, res: Response, next: NextFunction) => {
  const filter = { isActive: true };
  UserDAL.getAllSecured(filter)
    .then((data: any) => {
      if (data.length == 0) {
        throw new CustomError("Data not found", 404, data);
      }
      res.status(200).json(data);
    })
    .catch((err) => {
      next(err);
    });
};

const getUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  UserDAL.getOnePopulated(
    { _id: userId, isActive: true },
    "address",
    "institution"
  )
    .then((data: any) => {
      if (!data) {
        throw new CustomError("User not found", 404);
      }
      res.status(200).json(data);
    })
    .catch((err) => {
      next(err);
    });
};

const getLoggedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const loggedInUser = await UserDAL.getOne(
    { email: req.user.email },
    "address"
  );
  if (loggedInUser) {
    res.status(200).json(loggedInUser);
  } else {
    return res
      .status(404)
      .json(new CustomError("No logged in user found", 404));
  }
};

const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  const { address, ...updatedUserInfo } = req.body;
  const userId = req.params.id;

  if (req.user._id == req.params.id) {
    try {
      const session = await db.Connection.startSession();
      session.startTransaction();

      await UserDAL.updateWithTransaction(updatedUserInfo, userId, session);
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ message: "Information updated" });
    } catch (error) {
      return res.status(400).json(new CustomError("Update Failed", 400));
    }
  } else {
    return res.status(401).json(new CustomError("Not Authorized", 401));
  }
};

const deleteUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  if (req.user._id == userId) {
    UserDAL.deleteOne(userId)
      .then((data) => {
        if (!data) {
          throw new CustomError("Cannot delete user", 404);
        }
        res.status(200).json({ message: "Account deleted", data });
      })
      .catch((err) => {
        next(err);
      });
  } else {
    return res.status(401).json(new CustomError("Not Authorized", 401));
  }
};

// const forgetPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   // get user by the email
//   const userEmail = req.body.email
//   const User = await UserDAL.getOne({ email: userEmail, isActive: true })
//   if (!User) {
//     return res.status(400).json({ message: 'user with this email not found' })
//   }

//   // generate the OTP
//   const OTP = generateOTP(6)
//   const newOTP = {
//     user: User._id,
//     otp: OTP
//   }

//   // generate OTP and link it with the user
//   const data = await OTPDal.createOne(newOTP)
//   if (!data) {
//     return res.status(400).json({ message: 'error generating reset link' })
//   }

//   // send email to the user with the generated email
//   const encryptedUserId = encryptId(User._id)
//   const credentials = {
//     link: OTP,
//     to: User.email,
//     intent: 'Resetting your user password',
//     proc: 'Password Reset',
//     extra: 'Generated OTP expires within a day'
//   }

//   const Email = await sendMail(credentials)
//   if (!Email) {
//     OTPDal.deleteOne('', true, { _id: data._id })
//     return res
//       .status(500)
//       .json({ message: 'could not send reset link, try later' })
//   }
//   return res
//     .status(200)
//     .json({ message: 'Password reset link sent to the email' })
// }

// const validateOtp = async (req: Request, res: Response, next: NextFunction) => {
//   const userEmail = req.body.email
//   const userOtp = req.body.otp
//   const userInfo = await UserDAL.getOne({ email: userEmail })
//   // search for an OTP with the requested User
//   try {
//     const otp = await OTPDal.getOne({ otp: userOtp, user: userInfo._id })
//     if (otp) {
//       console.log(otp.user, userInfo._id)
//       return res.status(200).json({ message: 'Valid' })
//     } else {
//       return res.status(400).json({ message: 'Not Valid' })
//     }
//   } catch (err) {
//     return res.status(500).json(err)
//   }
// }

// const resetPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { otp, password } = req.body
//   const userOtp = await OTPDal.getOne({ otp: otp })

//   const newPassword = bcrypt.hashSync(password, 12)
//   UserDAL.updateOne({ password: newPassword }, userOtp.user)
//     .then((data) => {
//       if (!data) {
//         return res.status(400).send("Couldn't update password ")
//       }

//       res.status(200).json({ message: 'Password reset succesfully' })
//       OTPDal.deleteOne('', true, { otp: otp })
//       return
//     })
//     .catch((err) => {
//       next(err)
//     })
// }

// const changePassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   console.log('---->change password called')
//   const oldPass = req.body.oldPass
//   const newPass = req.body.newPass
//   const newPassword = bcrypt.hashSync(newPass, 12)
//   const userId = req.user._id
//   const user = await UserDAL.getOne({ _id: userId, isActive: true })

//   if (bcrypt.compareSync(oldPass, user.password)) {
//     UserDAL.updateOne({ password: newPassword }, userId)
//       .then((data) => {
//         if (!data) {
//           return res.status(400).send("Couldn't update password ")
//         }

//         return res.status(200).json({ message: 'Password changed succesfully' })
//       })
//       .catch((err) => {
//         next(err)
//       })
//   } else {
//     return res
//       .status(400)
//       .json({ message: 'The old password you entered is wrong' })
//   }
// }

// const uploadProfileImage = async (
//   req: any,
//   res: Response,
//   next: NextFunction
// ) => {
//   const currentUser = req.user._id
//   const userId = req.params.id
//   if (currentUser == userId) {
//     try {
//       const resultURL = await streamUpload(req, 'user-profiles')
//       if (resultURL) {
//         UserDAL.updateOne({ profileImage: resultURL }, userId)
//           .then((data) => {
//             if (!data) {
//               throw new CustomError('Cannot update User', 400)
//             }
//             res.status(200).json({ message: 'image upload successful', data })
//           })
//           .catch((err) => {
//             res.status(400).json(err)
//           })
//       } else {
//         res.status(400).json({ message: 'error uploading image to storage' })
//       }
//     } catch (error) {
//       throw new CustomError('There is an error uploading')
//     }
//   } else {
//     res.status(401).json({ message: 'Not Authorized for this Operations' })
//   }
// }

export default {
  create,
  //   verifyEmail,
  login,
  getAllUser,
  getUser,
  updateUser,
  deleteUser,
  getLoggedUser,
  // forgetPassword,
  //   validateOtp,
  //   resetPassword,
  //   changePassword,
  //   uploadProfileImage,
};
