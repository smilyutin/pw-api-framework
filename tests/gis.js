// Example GIS Test Script
// This script calculates the distance between two geo-points and suggests nearby locations

// Step 1: Sample test data
const userLocation = { lat: 49.2827, lon: -123.1207 }; // Vancouver
const locations = [
  { name: "Stanley Park", lat: 49.3043, lon: -123.1443 },
  { name: "Capilano Suspension Bridge", lat: 49.3429, lon: -123.1149 },
  { name: "Grouse Mountain", lat: 49.3791, lon: -123.0828 },
  { name: "Victoria", lat: 48.4284, lon: -123.3656 }
];

// Step 2: Function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Step 3: Function to find nearby locations within a radius
function findNearbyLocations(user, allLocations, radiusKm) {
  return allLocations
    .map(loc => {
      const distance = calculateDistance(user.lat, user.lon, loc.lat, loc.lon);
      return { ...loc, distance: distance.toFixed(2) };
    })
    .filter(loc => loc.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// Step 4: Run test scenario
const nearbyPlaces = findNearbyLocations(userLocation, locations, 100);
console.log("Nearby Locations within 100 km:");
nearbyPlaces.forEach(loc =>
  console.log(`${loc.name} - ${loc.distance} km away`)
);