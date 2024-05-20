function calculateDistance(lat1, lng1, lat2, lng2) {
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
  return distance;
}

async function fetchRoute(origin, destination) {
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

function decodePolyline(encoded) {
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
function findClosestNode(nodeSet, targetNode) {
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
function checkDirection(route, depNode, destNode) {
  const depIndex = route.findIndex(
    (node) => node[0] === depNode[0] && node[1] === depNode[1]
  );
  const destIndex = route.findIndex(
    (node) => node[0] === destNode[0] && node[1] === destNode[1]
  );
  return depIndex !== -1 && destIndex !== -1 && depIndex < destIndex;
}

function calculateFare(distance, perKmRate) {
  return distance * perKmRate;
}

// Function to match a single ride request with multiple ride offers
async function matchRideRequest(rideRequest, rideOffers) {
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

        if (
          checkDirection(routeArray, closestSourceNode, closestDestinationNode)
        ) {
          return {
            offer,
            closestSourceNode,
            closestDestinationNode,
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

// // Function to match multiple ride requests with multiple ride offers
// async function matchAllRideRequests(rideRequests, rideOffers) {
//   const results = await Promise.all(
//     rideRequests.map((request) => matchRideRequest(request, rideOffers)),
//   );
//   return results;
// }

// Mock data for demo purposes with dummy latitudes and longitudes
const rideOffers = [
  // {
  //   id: 1,
  //   source: { lat: 37.77494, lng: -122.4194 },
  //   destination: { lat: 37.80134, lng: -122.476 },
  //   time: "08:00",
  //   freeSeats: 2,
  // },
  {
    id: 2,
    source: { lat: 41.88835, lng: -87.6231 },
    destination: { lat: 41.9029, lng: -87.6336 },
    time: "09:00",
    freeSeats: 3,
  },
  // {
  //   id: 3,
  //   source: { lat: 29.95388, lng: -90.0715 },
  //   destination: { lat: 29.96394, lng: -90.058 },
  //   time: "10:00",
  //   freeSeats: 1,
  // },
];

const rideRequests = [
  {
    id: 1,
    // source: { lat: 37.77523, lng: -122.4231 },
    // destination: { lat: 37.80134, lng: -122.4812 },
    source: { lat: 41.89321, lng: -87.6184 },
    destination: { lat: 41.89659, lng: -87.6297 },
    time: "08:30",
  },
  {
    id: 2,
    source: { lat: 41.89321, lng: -87.6184 },
    destination: { lat: 41.89659, lng: -87.6297 },
    time: "09:30",
  },
  {
    id: 3,
    // source: { lat: 29.95849, lng: -90.0668 },
    // destination: { lat: 29.96346, lng: -90.0533 },
    source: { lat: 41.89321, lng: -87.6184 },
    destination: { lat: 41.89659, lng: -87.6297 },
    time: "10:30",
  },
];

// // Execute matching
// matchAllRideRequests(rideRequests, rideOffers)
// .then((matches) => {
//   matches.forEach((match) => {
//     if (match) {
//       console.log(`Ride Request matched with Offer ID: ${match.offer.id}`);
//       console.log(
//         `Pickup Node: ${match.closestSourceNode[0]}, ${match.closestSourceNode[1]}`,
//       );
//       console.log(
//         `Dropoff Node: ${match.closestDestinationNode[0]}, ${match.closestDestinationNode[1]}`,
//       );
//     } else {
//       console.log(`No match found for Ride Request.`);
//     }
//   });
// })
// .catch((error) => {
//   console.error("Error matching ride requests:", error);
// });

// get the longest distance cooridnates
function getLongestDistanceCoordinates(rideRequests, rideOffers) {
  const results = rideRequests.map((request) => {
    return rideOffers.map((offer) => {
      return fetchRoute(
        [offer.source.lat, offer.source.lng],
        [offer.destination.lat, offer.destination.lng]
      );
    });
  });

  return results;
}

async function matchRideRequestWithFare(rideRequest, rideOffers) {
  const perKmRate = 10; // Per kilometer rate in your currency

  const { source, destination } = rideRequest;

  const match = await matchRideRequest(rideRequest, rideOffers);
  if (!match) {
    return null;
  }

  const { route, closestSourceNode, closestDestinationNode } = match;
  const routeArray = decodePolyline(route);
  console.log(source, destination);

  let totalDistance = 0;
  for (let i = 0; i < routeArray.length - 1; i++) {
    totalDistance += calculateDistance(
      routeArray[i][0],
      routeArray[i][1],
      routeArray[i + 1][0],
      routeArray[i + 1][1]
    );
  }

  let pickupIndex = routeArray.findIndex(
    (node) =>
      node[0] === closestSourceNode[0] && node[1] === closestSourceNode[1]
  );
  let dropoffIndex = routeArray.findIndex(
    (node) =>
      node[0] === closestDestinationNode[0] &&
      node[1] === closestDestinationNode[1]
  );

  let passengerDistance = 0;
  for (let i = pickupIndex; i < dropoffIndex; i++) {
    passengerDistance += calculateDistance(
      source.lat,
      source.lng,
      destination.lat,
      destination.lng
    );
  }

  console.log(totalDistance, passengerDistance);

  // calculate total number of passangers
  const totalPassengers = rideRequests.length;

  const totalFare = calculateFare(totalDistance, perKmRate);
  const distanceRatio = passengerDistance / totalDistance;
  console.log("Distacne: ", distanceRatio);

  const payRatio = distanceRatio / totalPassengers;
  console.log("Pay Ratio: ", payRatio);

  const passengerFare = totalFare * payRatio;

  return {
    ...match,
    totalFare,
    passengerFare,
  };
}

async function matchAllRideRequestsWithFare(rideRequests, rideOffers) {
  const results = await Promise.all(
    rideRequests.map((request) => matchRideRequestWithFare(request, rideOffers))
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

  const totalFareForLongestDistance = calculateFare(longestDistance, 5, 2);

  allMatchedOffers.forEach((match) => {
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

    let passengerDistance = 0;
    for (let i = pickupIndex; i < dropoffIndex; i++) {
      passengerDistance += calculateDistance(
        routeArray[i][0],
        routeArray[i][1],
        routeArray[i + 1][0],
        routeArray[i + 1][1]
      );
    }

    const passengerFare =
      (passengerDistance / longestDistance) * totalFareForLongestDistance;
    match.passengerFare = passengerFare;
  });

  return allMatchedOffers;
}

// Execute the matching with fare calculation
matchAllRideRequestsWithFare(rideRequests, rideOffers)
  .then((matches) => {
    matches.forEach((match) => {
      if (match) {
        console.log(`Ride Request matched with Offer ID: ${match.offer.id}`);
        console.log(
          `Pickup Node: ${match.closestSourceNode[0]}, ${match.closestSourceNode[1]}`
        );
        console.log(
          `Dropoff Node: ${match.closestDestinationNode[0]}, ${match.closestDestinationNode[1]}`
        );
        console.log(`Total Fare for Longest Distance: ${match.totalFare}`);
        console.log(`Passenger Fare: ${match.passengerFare}`);
      } else {
        console.log(`No match found for Ride Request.`);
      }
    });
  })
  .catch((error) => {
    console.error("Error matching ride requests:", error);
  });
