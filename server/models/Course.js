const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  thumbnail: { type: String },
  videoUrl: { type: String },
  resources: { type: String },
  notes: { type: String },
});

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  modules: [moduleSchema],
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String },
  chapters: [chapterSchema],
});

module.exports = mongoose.model("Course", courseSchema);