// routes/booking.js
const express = require('express');
const { protect } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const matchingService = require('../services/matching');
const redisClient = require('../utils/redisClient');

const router = express.Router();

// Create a new booking
router.post('/', protect, async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, vehicleType, scheduledTime, goodsDescription, goodsWeight } = req.body;

    // Calculate distance using Google Maps API (simplified)
    const distance = await calculateDistance(pickupLocation.coordinates, dropoffLocation.coordinates);
    
    // Get price estimate
    const priceResponse = await fetch(`${process.env.API_URL}/pricing/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({
        distance,
        vehicleType,
        pickupLocation,
        dropoffLocation
      })
    });

    if (!priceResponse.ok) {
      throw new Error('Failed to get price estimate');
    }

    const priceData = await priceResponse.json();

    // Create booking
    const booking = await Booking.create({
      user: req.user._id,
      pickupLocation,
      dropoffLocation,
      vehicleType,
      estimatedPrice: priceData.estimatedPrice,
      distance,
      scheduledTime: scheduledTime || new Date(),
      goodsDescription,
      goodsWeight
    });

    // Find available drivers
    const availableDrivers = await Driver.find({
      isAvailable: true,
      'vehicle.type': vehicleType,
      currentLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupLocation.coordinates
          },
          $maxDistance: 10000 // 10km radius
        }
      }
    }).limit(10);

    // Use matching algorithm to select best driver
    const selectedDriver = matchingService.findBestDriver(availableDrivers, pickupLocation.coordinates);
    
    if (selectedDriver) {
      // Assign driver to booking
      booking.driver = selectedDriver._id;
      booking.status = 'accepted';
      await booking.save();

      // Update driver status
      selectedDriver.isAvailable = false;
      await selectedDriver.save();

      // Notify driver via WebSocket
      const io = req.app.get('io');
      io.to(`driver_${selectedDriver._id}`).emit('newBooking', {
        bookingId: booking._id,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        estimatedPrice: booking.estimatedPrice
      });

      // Cache booking info in Redis
      await redisClient.set(`booking:${booking._id}`, JSON.stringify(booking), 3600);
    }

    res.status(201).json({
      success: true,
      booking,
      message: selectedDriver ? 'Driver assigned successfully' : 'Searching for available drivers'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user bookings
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find({ user: req.user._id })
      .populate('driver', 'name phone vehicle')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      bookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBookings: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get booking details
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name phone')
      .populate('driver', 'name phone vehicle currentLocation');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.user._id.toString() !== req.user._id.toString() && req.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Cancel booking
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Only allow cancellation if not already picked up
    if (['picked_up', 'in_transit', 'delivered'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking at current stage'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Notify driver if assigned
    if (booking.driver) {
      const io = req.app.get('io');
      io.to(`driver_${booking.driver}`).emit('bookingCancelled', {
        bookingId: booking._id
      });

      // Make driver available again
      await Driver.findByIdAndUpdate(booking.driver, {
        isAvailable: true
      });
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to calculate distance
async function calculateDistance(coord1, coord2) {
  // In production, use Google Maps Distance Matrix API
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  // Haversine formula for great-circle distance
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

module.exports = router;