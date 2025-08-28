// utils/helpers.js
// Utility functions for the application

// Generate random OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

// Format distance for display
const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
};

// Format currency for display
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Calculate estimated time of arrival
const calculateETA = (distance, averageSpeed = 30) => {
  // averageSpeed in km/h, distance in meters
  const hours = (distance / 1000) / averageSpeed;
  const minutes = Math.round(hours * 60);
  return minutes;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number format
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

module.exports = {
  generateOTP,
  formatDistance,
  formatCurrency,
  calculateETA,
  isValidEmail,
  isValidPhone
};