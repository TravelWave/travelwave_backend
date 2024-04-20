import Joi, { ObjectSchema } from "joi";
import { NextFunction, Request, Response } from "express";
import CustomUserInterface from "../resources/users/interface";
import CustomUser from "../resources/users/model";

// Custom Joi validation for Mongoose ObjectId
export const JoiObjectId = Joi.extend({
  type: "objectId",
  base: Joi.string(),
  messages: {
    objectId: '"{{#label}}" must be a valid ObjectId',
  },
  validate(value, helpers) {
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      return { value, errors: helpers.error("objectId") };
    }
  },
});

// Middleware function to validate request body using Joi schema
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

// Define the user schema using the UserInterface
export const Schemas = {
  user: {
    create: Joi.object<CustomUserInterface>({
      full_name: Joi.string().min(2).max(100),
      phone_number: Joi.string().max(15).required(),
      is_driver: Joi.boolean().required(),
      password: Joi.string().min(6).max(100).required(),
      rating: Joi.number().min(0).max(5),
    }),
  },
};
