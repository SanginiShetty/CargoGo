// routes/admin.js
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Driver = require('../models/Driver');

const router = express.Router();

// Admin middleware - only allow admin users
router.use(protect);
router.use(authorize('admin'));

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Get counts
    const userCount = await User.countDocuments();
    const driverCount = await Driver.countDocuments();
    const bookingCount = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ 
      status: { $in: ['accepted', 'driver_en_route', 'picked_up', 'in_transit'] } 
    });

    // Get revenue data
    const revenueResult = await Booking.aggregate([
      { 
        $match: { 
          status: 'delivered',
          paymentStatus: 'completed',
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalPrice' },
          averageRevenue: { $avg: '$finalPrice' }
        }
      }
    ]);

    // Get booking trends
    const bookingTrends = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        users: userCount,
        drivers: driverCount,
        bookings: bookingCount,
        activeBookings,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
        averageRevenue: revenueResult[0]?.averageRevenue || 0
      },
      trends: bookingTrends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all bookings with filters
router.get('/bookings', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.vehicleType) filter.vehicleType = req.query.vehicleType;
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'name email')
      .populate('driver', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(filter);

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

// Get driver analytics
router.get('/analytics/drivers', async (req, res) => {
  try {
    const drivers = await Driver.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'driver',
          as: 'bookings'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          totalTrips: 1,
          rating: 1,
          isAvailable: 1,
          completedTrips: {
            $size: {
              $filter: {
                input: '$bookings',
                as: 'booking',
                cond: { $eq: ['$$booking.status', 'delivered'] }
              }
            }
          },
          totalEarnings: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$bookings',
                    as: 'booking',
                    cond: { $eq: ['$$booking.status', 'delivered'] }
                  }
                },
                as: 'booking',
                in: '$$booking.finalPrice'
              }
            }
          },
          averageRating: { $avg: '$bookings.rating' }
        }
      },
      { $sort: { totalEarnings: -1 } }
    ]);

    res.json({
      success: true,
      drivers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;