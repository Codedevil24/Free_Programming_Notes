const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const dotenv = require('dotenv');
const multer = require('multer');

dotenv.config();

// Multer setup for temporary file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'tmp/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Auth middleware
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        console.error('No token provided');
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('Authenticated user:', req.user);
        next();
    } catch (err) {
        console.error('Invalid token:', err.message);
        res.status(401).json({ message: 'Invalid token' });
    }
};

// UPDATED: Get all books with category filter - fixed empty results handling
router.get('/', async (req, res) => {
    try {
        console.log('Fetching books from MongoDB (test database)...');
        let query = { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };
        if (req.query.category && req.query.category !== 'All') {
            query.category = req.query.category;
        }
        const books = await Book.find(query).lean();
        console.log('Query result:', books);
        
        // FIXED: Return empty array instead of 404 for no results
        if (!books || books.length === 0) {
            console.log('No books found with isDeleted: false or missing isDeleted');
            return res.json([]); // Return empty array instead of 404
        }
        res.json(books);
    } catch (err) {
        console.error('Error fetching books:', err.message, err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get a specific book by ID
router.get('/:id', async (req, res) => {
    try {
        console.log('Fetching book with ID:', req.params.id);
        const book = await Book.findOne({ _id: req.params.id, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] }).lean();
        if (!book) {
            console.log('Book not found for ID:', req.params.id);
            return res.status(404).json({ message: 'Book not found' });
        }
        console.log('Book fetched:', book);
        res.json(book);
    } catch (err) {
        console.error('Error fetching book:', err.message, err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Add a new book (admin only)
router.post('/', authMiddleware, upload.fields([{ name: 'image' }, { name: 'pdf' }]), async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const image = req.files?.image?.[0];
        const pdf = req.files?.pdf?.[0];

        console.log('Received book data:', {
            title,
            description,
            category,
            image: !!image,
            pdf: !!pdf,
            files: Object.keys(req.files || {}),
            telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ? 'Token present' : 'Token missing',
            telegramChatId: process.env.TELEGRAM_CHAT_ID ? 'Chat ID present' : 'Chat ID missing'
        });

        if (!title || !description || !category || !image || !pdf) {
            console.error('Missing required fields');
            return res.status(400).json({ message: 'All fields (title, description, category, image, pdf) are required' });
        }

        // Validate file paths
        console.log('Image path:', image?.path, 'PDF path:', pdf?.path);
        if (!image?.path || !pdf?.path || !fs.existsSync(image.path) || !fs.existsSync(pdf.path)) {
            console.error('Invalid file paths:', { imagePath: image?.path, pdfPath: pdf?.path });
            return res.status(400).json({ message: 'Invalid file paths' });
        }

        // Validate Telegram credentials
        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
            console.error('Missing Telegram credentials');
            return res.status(500).json({ message: 'Telegram credentials not configured' });
        }

        // Upload image to Telegram
        console.log('Uploading image to Telegram');
        const imageForm = new FormData();
        imageForm.append('chat_id', process.env.TELEGRAM_CHAT_ID);
        imageForm.append('photo', fs.createReadStream(image.path));
        const imageResponse = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
            imageForm,
            { headers: imageForm.getHeaders() }
        ).catch(err => {
            console.error('Axios error uploading image:', err.response?.data || err.message);
            throw err;
        });
        if (!imageResponse.data.ok) {
            console.error('Telegram image upload failed:', imageResponse.data);
            return res.status(500).json({ message: 'Failed to upload image to Telegram', error: imageResponse.data });
        }
        const imageFileId = imageResponse.data.result.photo[imageResponse.data.result.photo.length - 1].file_id;
        const imageFile = await axios.get(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${imageFileId}`
        ).catch(err => {
            console.error('Axios error getting image file:', err.response?.data || err.message);
            throw err;
        });
        if (!imageFile.data.ok) {
            console.error('Telegram getFile failed for image:', imageFile.data);
            return res.status(500).json({ message: 'Failed to get image file from Telegram', error: imageFile.data });
        }
        const imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${imageFile.data.result.file_path}`;

        // Upload PDF to Telegram
        console.log('Uploading PDF to Telegram');
        const pdfForm = new FormData();
        pdfForm.append('chat_id', process.env.TELEGRAM_CHAT_ID);
        pdfForm.append('document', fs.createReadStream(pdf.path));
        const pdfResponse = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
            pdfForm,
            { headers: pdfForm.getHeaders() }
        ).catch(err => {
            console.error('Axios error uploading PDF:', err.response?.data || err.message);
            throw err;
        });
        if (!pdfResponse.data.ok) {
            console.error('Telegram PDF upload failed:', pdfResponse.data);
            return res.status(500).json({ message: 'Failed to upload PDF to Telegram', error: pdfResponse.data });
        }
        const pdfFileId = pdfResponse.data.result.document.file_id;
        const pdfFile = await axios.get(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${pdfFileId}`
        ).catch(err => {
            console.error('Axios error getting PDF file:', err.response?.data || err.message);
            throw err;
        });
        if (!pdfFile.data.ok) {
            console.error('Telegram getFile failed for PDF:', pdfFile.data);
            return res.status(500).json({ message: 'Failed to get PDF file from Telegram', error: pdfFile.data });
        }
        const pdfUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${pdfFile.data.result.file_path}`;

        // Save book to MongoDB
        console.log('Saving book to MongoDB');
        const book = new Book({ title, description, category, imageUrl, pdfUrl });
        await book.save();

        // Clean up temporary files
        console.log('Cleaning up temporary files');
        fs.unlinkSync(image.path);
        fs.unlinkSync(pdf.path);

        res.status(201).json(book);
    } catch (err) {
        console.error('Error adding book:', err.message, err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update a book (admin only)
router.put('/:id', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category } = req.body;
        const image = req.files?.image?.[0];
        const pdf = req.files?.pdf?.[0];

        console.log('Updating book:', { id, title, description, category, image: !!image, pdf: !!pdf });

        if (!title || !description || !category) {
            console.error('Missing required fields');
            return res.status(400).json({ message: 'Title, description, and category are required' });
        }

        const updateData = { title, description, category };

        if (image) {
            const imageForm = new FormData();
            imageForm.append('chat_id', process.env.TELEGRAM_CHAT_ID);
            imageForm.append('photo', fs.createReadStream(image.path));
            const imageResponse = await axios.post(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
                imageForm,
                { headers: imageForm.getHeaders() }
            ).catch(err => {
                console.error('Axios error uploading image:', err.response?.data || err.message);
                throw err;
            });
            if (!imageResponse.data.ok) {
                console.error('Telegram image upload failed:', imageResponse.data);
                return res.status(500).json({ message: 'Failed to upload image to Telegram' });
            }
            const imageFileId = imageResponse.data.result.photo[imageResponse.data.result.photo.length - 1].file_id;
            const imageFile = await axios.get(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${imageFileId}`
            ).catch(err => {
                console.error('Axios error getting image file:', err.response?.data || err.message);
                throw err;
            });
            if (!imageFile.data.ok) {
                console.error('Telegram getFile failed for image:', imageFile.data);
                return res.status(500).json({ message: 'Failed to get image file from Telegram' });
            }
            updateData.imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${imageFile.data.result.file_path}`;
            fs.unlinkSync(image.path);
        }

        if (pdf) {
            const pdfForm = new FormData();
            pdfForm.append('chat_id', process.env.TELEGRAM_CHAT_ID);
            pdfForm.append('document', fs.createReadStream(pdf.path));
            const pdfResponse = await axios.post(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
                pdfForm,
                { headers: pdfForm.getHeaders() }
            ).catch(err => {
                console.error('Axios error uploading PDF:', err.response?.data || err.message);
                throw err;
            });
            if (!pdfResponse.data.ok) {
                console.error('Telegram PDF upload failed:', pdfResponse.data);
                return res.status(500).json({ message: 'Failed to upload PDF to Telegram' });
            }
            const pdfFileId = pdfResponse.data.result.document.file_id;
            const pdfFile = await axios.get(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${pdfFileId}`
            ).catch(err => {
                console.error('Axios error getting PDF file:', err.response?.data || err.message);
                throw err;
            });
            if (!pdfFile.data.ok) {
                console.error('Telegram getFile failed for PDF:', pdfFile.data);
                return res.status(500).json({ message: 'Failed to get PDF file from Telegram' });
            }
            updateData.pdfUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${pdfFile.data.result.file_path}`;
            fs.unlinkSync(pdf.path);
        }

        const book = await Book.findByIdAndUpdate(id, updateData, { new: true });
        if (!book) {
            console.error('Book not found for ID:', id);
            return res.status(404).json({ message: 'Book not found' });
        }

        console.log('Book updated:', book);
        res.json(book);
    } catch (err) {
        console.error('Error updating book:', err.message, err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete a book (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Deleting book with ID:', id);

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            console.error('Invalid book ID format:', id);
            return res.status(400).json({ message: 'Invalid book ID format' });
        }

        const book = await Book.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!book) {
            console.error('Book not found for ID:', id);
            return res.status(404).json({ message: 'Book not found' });
        }

        console.log('Book deleted:', id);
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        console.error('Error deleting book:', err.message, err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
