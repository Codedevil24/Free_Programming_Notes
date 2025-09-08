const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    imageUrl: { type: String, required: true }, // FIXED: This will store the Telegram file_path (e.g., 'photos/file_1.jpg') instead of full URL
    pdfUrl: { type: String, required: true }, // FIXED: Same for PDF, store file_path
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);