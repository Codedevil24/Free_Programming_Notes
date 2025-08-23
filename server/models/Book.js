const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    imageUrl: { type: String, required: true },
    pdfUrl: { type: String, required: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);