function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radius of Earth in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers

  return Math.round(distance * 100) / 100;
}

async function fetchRoute(origin: number[], destination: number[]) {
  const response = await fetch(
    `https://graphhopper.com/api/1/route?point=${origin[0]},${origin[1]}&point=${destination[0]},${destination[1]}&key=f90e5c88-fb4f-4457-ad74-dcb99623c70f`
  );
  const data = await response.json();
  if (data.paths && data.paths.length > 0) {
    const encodedPoints = data.paths[0].points;
    return encodedPoints;
  }
  return null;
}

function decodePolyline(encoded: string) {
  const poly = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    const latlng = [lat * 1e-5, lng * 1e-5];
    poly.push(latlng);
  }
  return poly;
}

// Function to find the closest node
function findClosestNode(nodeSet: number[][], targetNode: number[]) {
  let closestNode = null;
  let minDistance = Infinity;
  nodeSet.forEach((node) => {
    const distance = Math.hypot(
      node[0] - targetNode[0],
      node[1] - targetNode[1]
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  });
  return closestNode;
}

// Function to check direction
function checkDirection(
  route: number[][],
  depNode: number[],
  destNode: number[]
) {
  const depIndex = route.findIndex(
    (node) => node[0] === depNode[0] && node[1] === depNode[1]
  );
  const destIndex = route.findIndex(
    (node) => node[0] === destNode[0] && node[1] === destNode[1]
  );
  return depIndex !== -1 && destIndex !== -1 && depIndex < destIndex;
}

function calculateFare(distance: number, perKmRate: number) {
  // round off the distance to the nearest integer
  const roundedDistance = Math.round(distance);
  return roundedDistance * perKmRate;
}

// Function to match a single ride request with multiple ride offers
async function matchRideRequest(rideRequest: any, rideOffers: any[]) {
  const { source, destination } = rideRequest;

  // get the lats and longs from all the souce and destinations
  const sourceLatLng = [source.lat, source.lng];
  const destinationLatLng = [destination.lat, destination.lng];

  const matchingOffers = await Promise.all(
    rideOffers.map(async (offer) => {
      var sourceLat = offer.source.lat;
      var sourceLng = offer.source.lng;
      var destinationLat = offer.destination.lat;
      var destinationLng = offer.destination.lng;

      const route = await fetchRoute(
        [sourceLat, sourceLng],
        [destinationLat, destinationLng]
      );
      if (!route) {
        console.log("No route found for this offer");
        return null;
      }

      var routeArray = decodePolyline(route);

      const sourceIntersection = routeArray.filter(
        (rNode) =>
          Math.hypot(rNode[0] - sourceLatLng[0], rNode[1] - sourceLatLng[1]) <
          0.01
      );

      const destinationIntersection = routeArray.filter(
        (rNode) =>
          Math.hypot(
            rNode[0] - destinationLatLng[0],
            rNode[1] - destinationLatLng[1]
          ) < 0.01
      );

      if (sourceIntersection.length > 0 && destinationIntersection.length > 0) {
        const closestSourceNode = findClosestNode(
          sourceIntersection,
          sourceLatLng
        );
        const closestDestinationNode = findClosestNode(
          destinationIntersection,
          destinationLatLng
        );

        let passengerDistance = 0;
        passengerDistance = calculateDistance(
          source.lat,
          source.lng,
          destination.lat,
          destination.lng
        );

        if (
          checkDirection(routeArray, closestSourceNode, closestDestinationNode)
        ) {
          return {
            offer,
            closestSourceNode,
            closestDestinationNode,
            passengerDistance,
            route,
          };
        }
      }

      return null;
    })
  );

  const validOffers = matchingOffers.filter((offer) => offer !== null);

  if (validOffers.length === 0) {
    return null;
  }

  // Select the best offer based on the shortest competing distance (simplified for demo)
  const bestOffer = validOffers.reduce((prev, curr) => {
    const prevDistance =
      Math.hypot(
        prev.closestSourceNode[0] - sourceLatLng[0],
        prev.closestSourceNode[1] - sourceLatLng[1]
      ) +
      Math.hypot(
        prev.closestDestinationNode[0] - destinationLatLng[0],
        prev.closestDestinationNode[1] - destinationLatLng[1]
      );
    const currDistance =
      Math.hypot(
        curr.closestSourceNode[0] - sourceLatLng[0],
        curr.closestSourceNode[1] - sourceLatLng[1]
      ) +
      Math.hypot(
        curr.closestDestinationNode[0] - destinationLatLng[0],
        curr.closestDestinationNode[1] - destinationLatLng[1]
      );

    return currDistance < prevDistance ? curr : prev;
  });

  return bestOffer;
}

export async function matchAllRideRequestsWithFare(
  rideRequests: any[],
  rideOffers: any[]
) {
  const results = await Promise.all(
    rideRequests.map((request) => matchRideRequest(request, rideOffers))
  );

  const allMatchedOffers = results.filter((result) => result !== null);

  const longestDistance = Math.max(
    ...allMatchedOffers.map((match) => {
      const { closestSourceNode, closestDestinationNode, route } = match;
      const routeArray = decodePolyline(route);

      let pickupIndex = routeArray.findIndex(
        (node) =>
          node[0] === closestSourceNode[0] && node[1] === closestSourceNode[1]
      );
      let dropoffIndex = routeArray.findIndex(
        (node) =>
          node[0] === closestDestinationNode[0] &&
          node[1] === closestDestinationNode[1]
      );

      let distance = 0;
      for (let i = pickupIndex; i < dropoffIndex; i++) {
        distance += calculateDistance(
          routeArray[i][0],
          routeArray[i][1],
          routeArray[i + 1][0],
          routeArray[i + 1][1]
        );
      }

      return distance;
    })
  );

  const totalFareForLongestDistance = calculateFare(longestDistance, 10);

  allMatchedOffers.forEach((match: any) => {
    let passengerDistance = match.passengerDistance;

    const totalPassengers = rideRequests.length;

    const totalFare = totalFareForLongestDistance;
    match.totalFare = totalFare;
    const distanceRatio = passengerDistance / longestDistance;

    const payRatio = distanceRatio / totalPassengers;

    const passengerFare = totalFare * payRatio;
    const roundedPassengerFare = Math.round(passengerFare * 100) / 100;
    match.passengerFare = roundedPassengerFare;
  });

  return allMatchedOffers;
}
