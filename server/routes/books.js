// server/routes/books.js
const express = require('express');
const multer = require('multer');
const Book = require('../models/Book');
const authMiddleware = require('../middleware/auth');
const { uploadToTelegram } = require('../utils/telegramUpload'); // NEW: Integrated Telegram upload utility
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure Multer for memory storage (since we'll upload to Telegram immediately)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit per file
});

// Helper function to handle file uploads to Telegram
async function handleFileUpload(file, type) {
  if (!file) return null;
  
  // Save temporarily to disk for Telegram upload
  const tempPath = path.join(__dirname, '..', 'temp', file.originalname);
  fs.writeFileSync(tempPath, file.buffer);
  
  try {
    const telegramUrl = await uploadToTelegram({ path: tempPath }, type);
    return telegramUrl;
  } catch (error) {
    console.error(`Error uploading ${type} to Telegram:`, error);
    throw new Error(`Failed to upload ${type}`);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

// GET all books (public) - With optional category filter
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ message: 'Server error while fetching books' });
  }
});

// GET single book by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (err) {
    console.error('Error fetching book:', err);
    res.status(500).json({ message: 'Server error while fetching book' });
  }
});

// POST add new book (admin only) - Updated with Telegram integration
router.post('/', authMiddleware, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, category } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description, and category are required' });
    }

    // Handle image upload
    const imageFile = req.files['image']?.[0];
    const imageUrl = imageFile ? await handleFileUpload(imageFile, 'photo') : '';

    // Handle PDF upload
    const pdfFile = req.files['pdf']?.[0];
    const pdfUrl = pdfFile ? await handleFileUpload(pdfFile, 'document') : '';

    if (!imageUrl || !pdfUrl) {
      return res.status(400).json({ message: 'Both image and PDF are required' });
    }

    // Create and save book
    const book = new Book({
      title,
      description,
      category,
      imageUrl,
      pdfUrl
    });

    await book.save();
    res.status(201).json({ message: 'Book added successfully', book });

  } catch (err) {
    console.error('Error adding book:', err);
    res.status(500).json({ message: 'Server error while adding book' });
  }
});

// PUT update book (admin only) - Updated with Telegram integration
router.put('/:id', authMiddleware, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    const { title, description, category } = req.body;

    // Update fields if provided
    if (title) book.title = title;
    if (description) book.description = description;
    if (category) book.category = category;

    // Handle image update if provided
    const imageFile = req.files['image']?.[0];
    if (imageFile) {
      book.imageUrl = await handleFileUpload(imageFile, 'photo');
    }

    // Handle PDF update if provided
    const pdfFile = req.files['pdf']?.[0];
    if (pdfFile) {
      book.pdfUrl = await handleFileUpload(pdfFile, 'document');
    }

    await book.save();
    res.json({ message: 'Book updated successfully', book });

  } catch (err) {
    console.error('Error updating book:', err);
    res.status(500).json({ message: 'Server error while updating book' });
  }
});

// DELETE book (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ message: 'Server error while deleting book' });
  }
});

module.exports = router;