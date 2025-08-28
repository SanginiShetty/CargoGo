// routes/pricing.js
const express = require('express');
const { protect } = require('../middleware/auth');
const pricingCalculator = require('../services/pricingCalculator');

const router = express.Router();

// Get price estimate
router.post('/estimate', protect, async (req, res) => {
  try {
    const { distance, vehicleType, pickupLocation, dropoffLocation } = req.body;

    // Calculate price using pricing service
    const price = await pricingCalculator.calculatePrice({
      distance,
      vehicleType,
      pickupLocation,
      dropoffLocation
    });

    res.json({
      success: true,
      estimatedPrice: price,
      currency: 'USD',
      distance: (distance / 1000).toFixed(2) + ' km'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Apply surge pricing
router.get('/surge-multiplier', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    // Calculate surge multiplier based on demand in the area
    const surgeMultiplier = await pricingCalculator.calculateSurgeMultiplier(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.json({
      success: true,
      surgeMultiplier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;