// models/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  speed: Number,
  heading: Number,
  accuracy: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create geospatial index and TTL index for automatic data expiration
locationSchema.index({ location: '2dsphere' });
locationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = mongoose.model('Location', locationSchema);