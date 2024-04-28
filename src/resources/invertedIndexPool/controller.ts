import { Request, Response } from "express";
import InvertedIndexPool from "../invertedIndexPool/model";
import dataAccessLayer from "../../common/dal";
import logger from "../../common/logger";

const invertedIndexPoolDAL = dataAccessLayer(InvertedIndexPool);

export const getInvertedIndexPoolByRideId = async (
  req: Request,
  res: Response
) => {
  try {
    const rideId = req.params.rideId;
    const invertedIndexPool = await invertedIndexPoolDAL.getOnePopulated({
      ride_id: rideId,
    });
    if (!invertedIndexPool) {
      return res.status(404).send("Inverted index pool not found");
    }
    return res.status(200).send(invertedIndexPool);
  } catch (error) {
    logger.error("Error in getInvertedIndexPoolByRideId: ", error);
    return res.status(500).send("Internal server error");
  }
};

export const getInvertedIndexPools = async (req: Request, res: Response) => {
  try {
    const invertedIndexPools = await invertedIndexPoolDAL.getMany({});
    return res.status(200).send(invertedIndexPools);
  } catch (error) {
    logger.error("Error in getInvertedIndexPools: ", error);
    return res.status(500).send("Internal server error");
  }
};
