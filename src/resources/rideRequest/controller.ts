import { Request, Response } from "express";
import RideRequest from "./model";
import RideRequestInterface from "./interface";
import dataAccessLayer from "../../common/dal";

const rideRequestDAL = dataAccessLayer(RideRequest);

async function fetchRoute(origin, destination) {
  const response = await fetch(
    `https://graphhopper.com/api/1/route?point=${origin[0]},${origin[1]}&point=${destination[0]},${destination[1]}&key=${process.env.GRAPH_HOPPER_API_KEY}`
  );
  const data = await response.json();
  if (data.paths && data.paths.length > 0) {
    const encodedPoints = data.paths[0].points;
    // const decodedPoints = decodePolyline(encodedPoints);
    // console.log("Decoded Points : ", decodedPoints);
    // return decodedPoints;
    return encodedPoints;
  }
  return null;
}

export const createRideRequest = async (req: Request, res: Response) => {
  try {
    const rideRequest: RideRequestInterface = req.body;
    const user = req.user;

    const id = user._id;

    rideRequest.passenger = id;

    const origin = [rideRequest.start_latitude, rideRequest.start_longitude];
    const destination = [rideRequest.end_latitude, rideRequest.end_longitude];

    const shortestPath = await fetchRoute(origin, destination);

    if (!shortestPath) {
      throw new Error("No path found");
    }

    rideRequest.shortest_path = shortestPath;

    rideRequest.status = "pending";

    const createdRideRequest = await rideRequestDAL.createOne(rideRequest);
    res.status(201).json(createdRideRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRideRequests = async (req: Request, res: Response) => {
  try {
    const rideRequests = await rideRequestDAL.getMany({});
    res.status(200).json(rideRequests);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getRideRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const rideRequest = await rideRequestDAL.getOne({ _id: id });
    res.status(200).json(rideRequest);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const cancelRideRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const rideRequest = await rideRequestDAL.deleteOne(id, true);
    res.status(200).json(rideRequest);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export default {
  createRideRequest,
  getRideRequests,
  getRideRequest,
  cancelRideRequest,
};
