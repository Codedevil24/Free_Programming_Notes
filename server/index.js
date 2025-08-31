const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const courseRoutes = require('./routes/courses');

console.log('ðŸš€ Starting Free Programming Notes Server...');

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'https://free-programming-notes-1.onrender.com',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:8080',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Enhanced middleware
app.use(express.json({ 
  limit: '100mb',
  extended: true 
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '100mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  
  console.log(`ðŸ“¡ ${timestamp} - ${method} ${url}`);
  console.log(`ðŸ‘¤ IP: ${ip}`);
  
  // Log body for POST/PUT requests (but not files)
  if ((method === 'POST' || method === 'PUT') && req.body && Object.keys(req.body).length > 0) {
    console.log('ðŸ“ Body keys:', Object.keys(req.body));
  }
  
  next();
});

// MongoDB connection with enhanced error handling
const connectWithRetry = async () => {
  const maxRetries = 5;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`ðŸ”— Attempting MongoDB connection (attempt ${retryCount + 1}/${maxRetries})...`);
      
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 30000, // 30 seconds
        socketTimeoutMS: 60000,         // 60 seconds  
        maxPoolSize: 10,
        retryWrites: true,
        w: 'majority',
        connectTimeoutMS: 30000,
        dbName: 'test'
      });
      
      console.log('âœ… Successfully connected to MongoDB Atlas (test database)');
      
      // Test the connection
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      console.log('ðŸ“š Available collections:', collections.map(c => c.name));
      
      // Verify models can be used
      try {
        const Book = require('./models/Book');
        const Course = require('./models/Course');
        
        await Book.createIndexes();
        await Course.createIndexes();
        console.log('ðŸ“Š Database indexes created/verified successfully');
      } catch (indexError) {
        console.log('âš ï¸ Index creation warning:', indexError.message);
      }
      
      return; // Success, exit retry loop
      
    } catch (err) {
      console.error(`âŒ MongoDB connection attempt ${retryCount + 1} failed:`, err.message);
      
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error('ðŸ’€ Failed to connect to MongoDB after all retries');
        throw err;
      }
      
      console.log(`â³ Waiting 5 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Initialize database connection
connectWithRetry().catch(err => {
  console.error('ðŸ’€ Critical: Failed to connect to MongoDB:', err);
  process.exit(1);
});

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('ðŸ“¡ Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('âŒ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('ðŸ“¡ Mongoose disconnected from MongoDB');
});

// API Routes
console.log('ðŸ›£ï¸ Setting up API routes...');

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/courses', courseRoutes);

console.log('âœ… API routes configured');

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ðŸŽ“ Free Programming Notes API',
    version: '2.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      books: '/api/books', 
      courses: '/api/courses',
      health: '/health'
    },
    docs: 'https://github.com/Codedevil24/Free_Programming_Notes'
  });
});

// Comprehensive health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      status: mongoose.connection.readyState === 1 ? 'âœ… Connected' : 'âŒ Disconnected',
      host: mongoose.connection.host || 'Unknown',
      name: mongoose.connection.name || 'Unknown'
    },
    config: {
      mongoUri: process.env.MONGO_URI ? 'âœ… Configured' : 'âŒ Missing',
      jwtSecret: process.env.JWT_SECRET ? 'âœ… Configured' : 'âŒ Missing',
      telegramBot: process.env.TELEGRAM_BOT_TOKEN ? 'âœ… Configured' : 'âŒ Missing',
      telegramChat: process.env.TELEGRAM_CHAT_ID ? 'âœ… Configured' : 'âŒ Missing',
      adminUsername: process.env.ADMIN_USERNAME ? 'âœ… Configured' : 'âŒ Missing',
      adminPassword: process.env.ADMIN_PASSWORD ? 'âœ… Configured' : 'âŒ Missing'
    }
  };
  
  res.json(healthCheck);
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('\nðŸš¨ ===== GLOBAL ERROR HANDLER =====');
  console.error('ðŸ“… Timestamp:', new Date().toISOString());
  console.error('ðŸ›£ï¸ Route:', req.method, req.originalUrl);
  console.error('âŒ Error:', err.message);
  console.error('ðŸ“‹ Stack:', err.stack);
  
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(statusCode).json({ 
      message, 
      errors,
      type: 'ValidationError'
    });
  }
  
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    return res.status(statusCode).json({ 
      message,
      type: 'CastError'
    });
  }
  
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry detected';
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(statusCode).json({ 
      message: `${message}: ${field}`,
      field,
      type: 'DuplicateError'
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    return res.status(statusCode).json({ 
      message,
      type: 'AuthError'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    return res.status(statusCode).json({ 
      message,
      type: 'AuthError'
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File size too large';
    return res.status(statusCode).json({ 
      message,
      type: 'FileError'
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 413;
    message = 'Too many files uploaded';
    return res.status(statusCode).json({ 
      message,
      type: 'FileError'
    });
  }
  
  // Default error response
  res.status(statusCode).json({ 
    message,
    type: 'ServerError',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  console.log(`â“ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      root: 'GET /',
      health: 'GET /health',
      auth: 'POST /api/auth/login',
      books: 'GET /api/books',
      courses: 'GET /api/courses'
    }
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\nðŸ›‘ ${signal} received. Starting graceful shutdown...`);
  
  // Close MongoDB connection
  mongoose.connection.close(() => {
    console.log('ðŸ“¡ MongoDB connection closed');
    console.log('ðŸ‘‹ Server shutdown complete');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('ðŸ’¥ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('ðŸ’¥ Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\nðŸŽ‰ ===== SERVER STARTED SUCCESSFULLY =====');
  console.log(`ðŸš€ Server running on port ${PORT}`);
  console.log(`ðŸŒ Local URL: http://localhost:${PORT}`);
  console.log(`ðŸ“Š Health check: http://localhost:${PORT}/health`);
  console.log(`ðŸ“š API documentation: http://localhost:${PORT}/`);
  console.log(`ðŸŒ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ðŸ“… Started at: ${new Date().toISOString()}`);
  console.log('=======================================\n');
  
  // Log configuration status
  console.log('ðŸ”§ Configuration Status:');
  console.log(`  ðŸ“Š MongoDB: ${process.env.MONGO_URI ? 'âœ…' : 'âŒ'}`);
  console.log(`  ðŸ” JWT Secret: ${process.env.JWT_SECRET ? 'âœ…' : 'âŒ'}`);
  console.log(`  ðŸ‘¤ Admin User: ${process.env.ADMIN_USERNAME ? 'âœ…' : 'âŒ'}`);
  console.log(`  ðŸ¤– Telegram Bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'âœ…' : 'âŒ'}`);
  console.log(`  ðŸ’¬ Telegram Chat: ${process.env.TELEGRAM_CHAT_ID ? 'âœ…' : 'âŒ'}`);
  console.log('');
});