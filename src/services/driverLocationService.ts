import RideSchema from "../resources/ride/model";
import VehicleSchema from "../resources/vehicles/model";
import dataAccessLayer from "../common/dal";

const rideDAL = dataAccessLayer(RideSchema);
const vehicleDAL = dataAccessLayer(VehicleSchema);

// Function to calculate distance between two points using Haversine formula
function calculateDistance(origin: number[], destination: number[]): number {
  const [lat1, lon1] = origin;
  const [lat2, lon2] = destination;

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

// Function to convert degrees to radians
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Function to find nearby drivers
export async function findNearbyDrivers(origin: number[]) {
  const vehicles = await vehicleDAL.getAllPopulated({ is_busy: false });
  const nearbyDrivers = [];

  for (const vehicle of vehicles) {
    const ride = await rideDAL.getOnePopulated({ vehicle: vehicle._id });
    if (ride) {
      // Assuming ride.latitude and ride.longitude are the current location of the driver
      const distance = calculateDistance(
        [ride.latitude, ride.longitude],
        origin
      );
      // If the driver is within 10km
      if (distance < 10000) {
        nearbyDrivers.push(vehicle.driver);
      }
    }
  }
  console.log(`Nearby drivers: ${nearbyDrivers}`);
  return nearbyDrivers;
}

// time is in milliseconds
const convertTime = (time: number) => {
  const seconds = Math.floor(time / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else {
    return `${seconds} second${seconds > 1 ? "s" : ""}`;
  }
};

export async function calculateETA(origin: number[], destination: number[]) {
  const response = await fetch(
    `https://graphhopper.com/api/1/route?point=${origin[0]},${origin[1]}&point=${destination[0]},${destination[1]}&key=${process.env.GRAPH_HOPPER_API_KEY}`
  );
  const data = await response.json();
  console.log(data);
  if (data.paths && data.paths.length > 0) {
    const time = data.paths[0].time;
    console.log(`ETA: ${time}`);
    const eta = convertTime(time);
    console.log(`ETA converted: ${eta}`);
    return eta;
  }
  return null;
}
