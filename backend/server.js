// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/database');
const redisClient = require('./utils/redisClient');

// Load environment variables
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/booking');
const pricingRoutes = require('./routes/pricing');
const trackingRoutes = require('./routes/tracking');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB Atlas
connectDB();

// Security middleware
app.use(helmet());

// Enable CORS
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/tracking', trackingRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join room for specific user/driver
  socket.on('join', (data) => {
    if (data.userId) {
      socket.join(`user_${data.userId}`);
    }
    if (data.driverId) {
      socket.join(`driver_${data.driverId}`);
    }
    console.log(`Socket ${socket.id} joined rooms for ${data.userId || data.driverId}`);
  });

  // Handle location updates from drivers
  socket.on('locationUpdate', async (data) => {
    try {
      // Broadcast to users tracking this driver
      socket.to(`user_${data.userId}`).emit('driverLocation', data);
      
      // Store in Redis for quick access
      await redisClient.set(`location:driver:${data.driverId}`, JSON.stringify(data), 60);
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  });

  // Handle booking updates
  socket.on('bookingUpdate', (data) => {
    if (data.userId) {
      socket.to(`user_${data.userId}`).emit('bookingStatus', data);
    }
    if (data.driverId) {
      socket.to(`driver_${data.driverId}`).emit('bookingStatus', data);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});