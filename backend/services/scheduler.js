// services/scheduler.js
const cron = require('node-cron');
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');

// Schedule tasks to run automatically
class Scheduler {
  init() {
    // Every minute: Check for expired bookings
    cron.schedule('* * * * *', this.checkExpiredBookings.bind(this));
    
    // Every hour: Clean up old data
    cron.schedule('0 * * * *', this.cleanupOldData.bind(this));
    
    // Every day at midnight: Update driver ratings
    cron.schedule('0 0 * * *', this.updateDriverRatings.bind(this));
  }

  // Check for bookings that need to be expired
  async checkExpiredBookings() {
    try {
      const expiredBookings = await Booking.find({
        status: 'pending',
        createdAt: { $lte: new Date(Date.now() - 10 * 60 * 1000) } // 10 minutes old
      });

      for (const booking of expiredBookings) {
        booking.status = 'expired';
        await booking.save();
        console.log(`Expired booking ${booking._id}`);
      }
    } catch (error) {
      console.error('Error checking expired bookings:', error);
    }
  }

  // Clean up old data
  async cleanupOldData() {
    try {
      // Delete locations older than 30 days
      const Location = require('../models/Location');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await Location.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });
      
      console.log(`Cleaned up ${result.deletedCount} old location records`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  // Update driver ratings based on recent trips
  async updateDriverRatings() {
    try {
      const drivers = await Driver.find({});
      
      for (const driver of drivers) {
        const recentBookings = await Booking.find({
          driver: driver._id,
          status: 'delivered',
          updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        });
        
        if (recentBookings.length > 0) {
          const totalRating = recentBookings.reduce((sum, booking) => sum + (booking.rating || 0), 0);
          const averageRating = totalRating / recentBookings.length;
          
          driver.rating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
          await driver.save();
        }
      }
      
      console.log('Updated driver ratings');
    } catch (error) {
      console.error('Error updating driver ratings:', error);
    }
  }
}

module.exports = new Scheduler();