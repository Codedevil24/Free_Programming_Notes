const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://127.0.0.1:8080', 'http://127.0.0.1:55630'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});