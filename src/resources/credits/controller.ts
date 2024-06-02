import { Request, Response } from "express";
import CreditSchema from "../credits/model";
import dataAccessLayer from "../../common/dal";

const creditsDAL = dataAccessLayer(CreditSchema);

export const createCreditOnSignUp = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Create the credit entry for the new user
    const newCredit = await creditsDAL.createOne({
      userId,
      credits: 0,
    });

    res.status(201).json(newCredit);
  } catch (error) {
    res.status(500).json({ message: "Internal server error.", error });
  }
};

export const updateCreditsForNormalRide = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.body;
    const creditAmount = 5;

    const userCredit = await creditsDAL.getOnePopulated({ userId: userId });
    if (!userCredit) {
      return res.status(404).json({ message: "Credit entry not found." });
    }

    userCredit.credits += creditAmount;
    await userCredit.save();

    res.status(200).json(userCredit);
  } catch (error) {
    res.status(500).json({ message: "Internal server error.", error });
  }
};

export const updateCreditsForPooledRide = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.body;
    const creditAmount = 10;

    const userCredit = await creditsDAL.getOnePopulated({ userId });
    if (!userCredit) {
      return res.status(404).json({ message: "Credit entry not found." });
    }

    userCredit.credits += creditAmount;
    await userCredit.save();

    res.status(200).json(userCredit);
  } catch (error) {
    res.status(500).json({ message: "Internal server error.", error });
  }
};

export const getUserCredits = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userCredit = await creditsDAL.getOnePopulated({ userId });
    if (!userCredit) {
      return res.status(404).json({ message: "Credit entry not found." });
    }

    res.status(200).json(userCredit);
  } catch (error) {
    res.status(500).json({ message: "Internal server error.", error });
  }
};

export default {
  createCreditOnSignUp,
  updateCreditsForNormalRide,
  updateCreditsForPooledRide,
  getUserCredits,
};
