// routes/tracking.js
const express = require('express');
const { protect } = require('../middleware/auth');
const Location = require('../models/Location');
const Booking = require('../models/Booking');
const redisClient = require('../utils/redisClient');

const router = express.Router();

// Update driver location
router.post('/location', protect, async (req, res) => {
  try {
    const { latitude, longitude, bookingId, speed, heading, accuracy } = req.body;

    // Save location to database
    const location = await Location.create({
      driver: req.user._id,
      booking: bookingId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      speed,
      heading,
      accuracy
    });

    // Update driver's current location
    if (req.userType === 'driver') {
      const Driver = require('../models/Driver');
      await Driver.findByIdAndUpdate(req.user._id, {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
          lastUpdated: new Date()
        }
      });
    }

    // Cache location in Redis for real-time access
    await redisClient.set(`location:driver:${req.user._id}`, JSON.stringify({
      latitude,
      longitude,
      timestamp: new Date(),
      speed,
      heading
    }), 60); // Expire after 1 minute

    // Notify users tracking this driver
    if (bookingId) {
      const io = req.app.get('io');
      io.to(`booking_${bookingId}`).emit('locationUpdate', {
        driverId: req.user._id,
        latitude,
        longitude,
        speed,
        heading,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get current driver location
router.get('/location/:driverId', protect, async (req, res) => {
  try {
    // Try to get from Redis cache first
    const cachedLocation = await redisClient.get(`location:driver:${req.params.driverId}`);
    
    if (cachedLocation) {
      return res.json({
        success: true,
        location: JSON.parse(cachedLocation),
        source: 'cache'
      });
    }

    // If not in cache, get from database
    const location = await Location.findOne({ 
      driver: req.params.driverId 
    }).sort({ timestamp: -1 });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      location: {
        latitude: location.location.coordinates[1],
        longitude: location.location.coordinates[0],
        timestamp: location.timestamp,
        speed: location.speed,
        heading: location.heading
      },
      source: 'database'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get booking tracking details
router.get('/booking/:bookingId', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('driver', 'name phone vehicle')
      .populate('user', 'name phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    if (booking.user._id.toString() !== req.user._id.toString() && 
        (!booking.driver || booking.driver._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    // Get location history for this booking
    const locations = await Location.find({ 
      booking: req.params.bookingId 
    }).sort({ timestamp: 1 });

    res.json({
      success: true,
      booking,
      locations: locations.map(loc => ({
        latitude: loc.location.coordinates[1],
        longitude: loc.location.coordinates[0],
        timestamp: loc.timestamp,
        speed: loc.speed
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;