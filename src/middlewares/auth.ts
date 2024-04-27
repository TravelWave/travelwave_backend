// auth middleware with jwt
import { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";
import dataAccessLayer from "../common/dal";
import User from "../resources/users/model";

const UserDAL = dataAccessLayer(User);

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = verify(token, process.env.JWT_SECRET);
    const user = await UserDAL.getAllSecured({ _id: decoded.userId });

    if (!user) return res.status(401).json({ message: "Not authorized" });

    if (!user[0].is_active)
      return res.status(401).json({
        message: "Account is not verified, please verify your phone number",
      });

    req.user = user[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized" });
  }
};
