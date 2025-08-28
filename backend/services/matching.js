// services/matching.js
const Driver = require('../models/Driver');

class MatchingService {
  // Find the best driver for a booking
  async findBestDriver(availableDrivers, pickupCoordinates) {
    if (availableDrivers.length === 0) return null;

    // Calculate distance for each driver and add to results
    const driversWithDistance = availableDrivers.map(driver => {
      const distance = this.calculateDistance(
        driver.currentLocation.coordinates,
        pickupCoordinates
      );
      return { driver, distance };
    });

    // Sort by distance (closest first)
    driversWithDistance.sort((a, b) => a.distance - b.distance);

    // Consider other factors like rating, availability, etc.
    const rankedDrivers = driversWithDistance.map((item, index) => {
      const score = this.calculateDriverScore(item.driver, item.distance, index);
      return { ...item, score };
    });

    // Sort by score (highest first)
    rankedDrivers.sort((a, b) => b.score - a.score);

    return rankedDrivers[0].driver;
  }

  // Calculate driver score based on multiple factors
  calculateDriverScore(driver, distance, distanceRank) {
    const distanceWeight = 0.6;
    const ratingWeight = 0.3;
    const completionRateWeight = 0.1;

    // Normalize distance (lower distance = higher score)
    const maxDistance = 10000; // 10km
    const distanceScore = 1 - (Math.min(distance, maxDistance) / maxDistance);

    // Rating score (5-star scale)
    const ratingScore = driver.rating / 5;

    // Completion rate (hypothetical)
    const completionRate = driver.totalTrips > 0 ? 
      (driver.totalTrips - (driver.cancelledTrips || 0)) / driver.totalTrips : 1;

    // Calculate final score
    return (distanceScore * distanceWeight) +
           (ratingScore * ratingWeight) +
           (completionRate * completionRateWeight);
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(coord1, coord2) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
  }

  // Find available drivers in area
  async findAvailableDrivers(vehicleType, coordinates, maxDistance = 10000) {
    return await Driver.find({
      isAvailable: true,
      'vehicle.type': vehicleType,
      currentLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coordinates
          },
          $maxDistance: maxDistance
        }
      }
    });
  }
}

module.exports = new MatchingService();