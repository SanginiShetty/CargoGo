// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const signToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Register user
router.post('/register/user', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      phone
    });

    // Generate token
    const token = signToken(user._id, 'user');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Register driver
router.post('/register/driver', async (req, res) => {
  try {
    const { email, password, name, phone, licenseNumber, vehicle } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ 
      $or: [{ email }, { licenseNumber }] 
    });
    
    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'Driver already exists with this email or license number'
      });
    }

    // Create driver
    const driver = await Driver.create({
      email,
      password,
      name,
      phone,
      licenseNumber,
      vehicle
    });

    // Generate token
    const token = signToken(driver._id, 'driver');

    res.status(201).json({
      success: true,
      token,
      driver: {
        id: driver._id,
        email: driver.email,
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        vehicle: driver.vehicle
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Login user or driver
router.post('/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    let user;
    if (userType === 'driver') {
      user = await Driver.findOne({ email }).select('+password');
    } else {
      user = await User.findOne({ email }).select('+password');
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = signToken(user._id, userType || 'user');

    res.json({
      success: true,
      token,
      [userType || 'user']: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    let userData;
    
    if (req.userType === 'driver') {
      userData = await Driver.findById(req.user._id);
    } else {
      userData = await User.findById(req.user._id);
    }

    res.json({
      success: true,
      user: userData,
      userType: req.userType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;