const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const courseRoutes = require('./routes/courses');
const axios = require('axios'); // NEW: For proxy
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['https://free-programming-notes.onrender.com'], // Updated to frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// NEW: Proxy route to serve Telegram files without exposing token (fixes image/PDF fetch issues)
app.get('/api/proxy/file/:filePath', async (req, res) => {
  try {
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${req.params.filePath}`;
    const response = await axios.get(url, { responseType: 'stream' });
    
    res.set('Content-Type', response.headers['content-type']);
    res.set('Content-Length', response.headers['content-length']);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    response.data.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ message: 'Failed to fetch file' });
  }
});

// MongoDB Atlas connection with retry
const connectWithRetry = async () => {
    let retries = 5;
    while (retries) {
        try {
            await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 45000,
                socketTimeoutMS: 60000,
                maxPoolSize: 10,
                retryWrites: true,
                w: 'majority',
                connectTimeoutMS: 45000,
                dbName: 'test'
            });
            console.log('Connected to MongoDB Atlas (test database)');
            mongoose.model('Book').createIndexes();
            return;
        } catch (err) {
            console.error('MongoDB connection error:', err.message, err.stack);
            retries -= 1;
            if (retries === 0) throw err;
            console.log(`Retrying connection (${retries} attempts left)...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};
connectWithRetry().catch(err => console.error('Failed to connect to MongoDB:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/courses', courseRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});