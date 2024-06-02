export function oneRideFarePriceCalculator(shortest_path: string) {
  const path = decodePolyline(shortest_path);
  const distance = calculateDistance(path);
  const price = calculatePrice(distance);
  return price;
}

function calculatePrice(distance: number): number {
  return distance * 10;
}

export function calculateDistance(path: number[][]): number {
  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [lat1, lon1] = path[i];
    const [lat2, lon2] = path[i + 1];

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
    distance += R * c; // Distance in km
  }
  return distance;
}

// Function to convert degrees to radians
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
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
