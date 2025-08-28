// services/pricingCalculator.js
const redisClient = require('../utils/redisClient');

class PricingCalculator {
  // Base rates per km for different vehicle types (in USD)
  baseRates = {
    bike: 0.5,
    car: 1.0,
    van: 1.8,
    truck: 2.5
  };

  // Minimum fares
  minimumFares = {
    bike: 3,
    car: 5,
    van: 8,
    truck: 12
  };

  // Calculate price based on distance, vehicle type, and other factors
  async calculatePrice({ distance, vehicleType, pickupLocation, dropoffLocation }) {
    // Get surge multiplier for the area
    const surgeMultiplier = await this.calculateSurgeMultiplier(
      pickupLocation.coordinates[1],
      pickupLocation.coordinates[0]
    );

    // Calculate base price (distance in meters, convert to km)
    const distanceKm = distance / 1000;
    let price = distanceKm * this.baseRates[vehicleType];

    // Apply surge pricing
    price *= surgeMultiplier;

    // Ensure minimum fare
    price = Math.max(price, this.minimumFares[vehicleType]);

    // Add any additional charges (tolls, waiting time, etc.)
    const additionalCharges = await this.calculateAdditionalCharges(
      pickupLocation,
      dropoffLocation
    );
    price += additionalCharges;

    // Round to 2 decimal places
    return Math.round(price * 100) / 100;
  }

  // Calculate surge multiplier based on demand in area
  async calculateSurgeMultiplier(latitude, longitude) {
    // In a real implementation, this would query real-time demand data
    // For now, we'll simulate based on time of day and random factors
    
    const now = new Date();
    const hour = now.getHours();
    
    // Base surge based on time of day
    let surge = 1.0;
    
    // Rush hours (7-9am, 4-7pm)
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      surge = 1.5;
    }
    
    // Weekend nights (10pm-2am Fri-Sat)
    if ((now.getDay() === 5 || now.getDay() === 6) && hour >= 22 || hour <= 2) {
      surge = 2.0;
    }
    
    // Add some random variation
    const randomVariation = Math.random() * 0.3; // 0-30% variation
    surge += randomVariation;
    
    // Cache surge data for this area
    const areaKey = `surge:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
    await redisClient.set(areaKey, surge.toString(), 300); // 5 minute cache
    
    return Math.min(surge, 3.0); // Cap at 3x
  }

  // Calculate additional charges (tolls, waiting time, etc.)
  async calculateAdditionalCharges(pickupLocation, dropoffLocation) {
    // In a real implementation, this would use mapping APIs
    // to determine toll roads and other charges
    
    // For now, return a fixed small amount
    return 1.5;
  }

  // Get regional pricing multipliers
  getRegionalMultiplier(latitude, longitude) {
    // Simplified regional pricing
    // In production, this would be based on geographic data
    
    // US and Europe have higher rates
    if (latitude > 25 && latitude < 50 && longitude > -130 && longitude < -60) {
      return 1.2; // North America
    }
    
    if (latitude > 35 && latitude < 60 && longitude > -10 && longitude < 40) {
      return 1.3; // Europe
    }
    
    // Asia and other regions have lower rates
    if (latitude > 0 && latitude < 40 && longitude > 60 && longitude < 150) {
      return 0.8; // Asia
    }
    
    return 1.0; // Default
  }
}

module.exports = new PricingCalculator();