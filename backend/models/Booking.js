// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  pickupLocation: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  dropoffLocation: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'car', 'van', 'truck'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'driver_en_route', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  estimatedPrice: {
    type: Number,
    required: true
  },
  finalPrice: Number,
  distance: {
    type: Number,
    required: true
  },
  duration: Number,
  scheduledTime: Date,
  actualPickupTime: Date,
  actualDropoffTime: Date,
  goodsDescription: String,
  goodsWeight: Number,
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for frequently queried fields
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ driver: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);