// models/Driver.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  vehicle: {
    type: {
      type: String,
      enum: ['bike', 'car', 'van', 'truck'],
      required: true
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true
    },
    capacity: {
      type: Number,
      required: true
    },
    color: String,
    make: String,
    model: String,
    year: Number
  },
  currentLocation: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String,
    lastUpdated: Date
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalTrips: {
    type: Number,
    default: 0
  },
  earnings: {
    type: Number,
    default: 0
  },
  documents: {
    licenseImage: String,
    vehicleRegistration: String,
    insurance: String
  },
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

// Create geospatial index for location-based queries
driverSchema.index({ currentLocation: '2dsphere' });

// Hash password before saving
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
driverSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);