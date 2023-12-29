import Joi, { ObjectSchema } from "joi";
import { NextFunction, Request, Response } from "express";
import IUserInterface from "../resources/users/interface";

// custom joi validation for mongoose id
export const JoiObjectId = Joi.extend({
  type: "objectId",
  base: Joi.string(),
  messages: {
    objectId: '"{{#label}}" must be a valid ObjectId(fix it)',
  },
  validate(value, helpers) {
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      return { value, errors: helpers.error("objectId") };
    }
  },
});

export const validateJoi = (schema: ObjectSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validateAsync(req.body);
    } catch (error) {
      return res.status(422).json({ error });
    }
    next();
  };
};
const addressSchema = Joi.object().keys({
  city: Joi.string(),
  subCity: Joi.string(),
  phone: Joi.string()
    .max(14)
    .min(10)
    .pattern(/^\+[0-9]+$/),
  woreda: Joi.string(),
  houseNo: Joi.string(),
});

export const Schemas = {
  user: {
    create: Joi.object<IUserInterface>({
      firstName: Joi.string().alphanum().min(2).max(30),
      lastName: Joi.string().alphanum().min(2).max(30),
      email: Joi.string().email(),
      gender: Joi.string().min(4).max(6),
      password: Joi.string().min(6).max(30),
      DoB: Joi.date(),
      role: Joi.string(),
      profileImage: Joi.string().uri(),
      isActive: Joi.boolean(),
    }),
  },
};
