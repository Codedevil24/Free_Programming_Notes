const mongoose = require('mongoose');

// Module sub‐document
const moduleSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  type:      { type: String, enum: ['file','link'], default: 'link' },
  thumbnail: { type: String },  // URL to uploaded thumbnail or link
  videoUrl:  { type: String },  // URL to uploaded video or link
  resources: { type: String },  // URL to uploaded PDF/doc or link
  notes:     { type: String }   // Any notes text
});

// Chapter sub‐document
const chapterSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  modules: { type: [moduleSchema], default: [] }
});

// Course top‐level schema
const courseSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  thumbnail:   { type: String }, // Course thumbnail URL
  videoUrl:    { type: String }, // Course video URL
  resources:   { type: String }, // Course resources URL
  chapters:    { type: [chapterSchema], default: [] },
  isDeleted:   { type: Boolean, default: false }
}, {
  timestamps: true // Automatically add createdAt/updatedAt
});

module.exports = mongoose.model('Course', courseSchema);