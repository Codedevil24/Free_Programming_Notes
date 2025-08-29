const mongoose = require('mongoose');

// Module/Lecture sub-document
const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['file', 'link'], default: 'link' },
  thumbnail: { type: String }, // URL to uploaded thumbnail or link
  videoUrl: { type: String }, // URL to uploaded video or link
  resources: { type: String }, // URL to uploaded PDF/doc or link
  notes: { type: String } // Any notes text
});

// Chapter sub-document
const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  modules: { type: [moduleSchema], default: [] }
});

// Enhanced Course schema
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  shortDescription: { type: String, required: true },
  longDescription: { type: String, default: '' },
  category: { type: String, required: true, index: true },
  thumbnail: { type: String }, // Course thumbnail URL
  thumbnailType: { type: String, enum: ['link', 'upload'], default: 'upload' },
  videoUrl: { type: String }, // Course intro video URL
  resources: { type: String }, // Course resources URL
  chapters: { type: [chapterSchema], default: [] },
  isDeleted: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' }
}, {
  timestamps: true // Automatically add createdAt/updatedAt
});

module.exports = mongoose.model('Course', courseSchema);