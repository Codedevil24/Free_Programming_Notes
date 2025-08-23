const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password: password ? 'provided' : 'missing' });

    if (!username || !password) {
        console.log('Missing credentials:', { username, password });
        return res.status(400).json({ message: 'Username and password required' });
    }

    try {
        if (username !== process.env.ADMIN_USERNAME) {
            console.log('Invalid username:', username);
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD);
        if (!isMatch) {
            console.log('Invalid password for username:', username);
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        console.log('Login successful:', username);
        res.json({ token });
    } catch (err) {
        console.error('Login error:', err.message, err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;