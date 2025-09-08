// server/routes/courses.js
const express = require('express');
const multer = require('multer');
const Course = require('../models/Course');
const authMiddleware = require('../middleware/auth');
const { uploadToTelegram } = require('../utils/telegramUpload'); // NEW: Integrated Telegram upload utility
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure Multer for memory storage (since we'll upload to Telegram immediately)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit per file
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

// Helper function to process module files
async function processModuleFiles(req, chapterIndex, moduleIndex, moduleData) {
  const prefix = `chapter_${chapterIndex}_module_${moduleIndex}`;
  
  if (moduleData.type === 'file') {
    const thumbFile = req.files[`${prefix}_thumb`]?.[0];
    const videoFile = req.files[`${prefix}_video`]?.[0];
    const resourcesFile = req.files[`${prefix}_resources`]?.[0];
    
    if (thumbFile) {
      moduleData.thumbnail = await handleFileUpload(thumbFile, 'photo');
    }
    if (videoFile) {
      moduleData.videoUrl = await handleFileUpload(videoFile, 'video');
    }
    if (resourcesFile) {
      moduleData.resources = await handleFileUpload(resourcesFile, 'document');
    }
  }
  
  return moduleData;
}

// GET all courses (public)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ message: 'Server error while fetching courses' });
  }
});

// GET single course by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ message: 'Server error while fetching course' });
  }
});

// POST add new course (admin only) - Updated with Telegram integration
router.post('/add-course', authMiddleware, upload.any(), async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      longDescription,
      category,
      difficulty = 'Beginner',
      featured = false,
      thumbnailType = 'file',
      thumbnailUrl
    } = req.body;

    // Validate required fields
    if (!title || !shortDescription || !category) {
      return res.status(400).json({ message: 'Title, short description, and category are required' });
    }

    // Handle thumbnail
    let thumbnail = '';
    if (thumbnailType === 'url' && thumbnailUrl) {
      thumbnail = thumbnailUrl;
    } else {
      const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnailFile');
      if (thumbnailFile) {
        thumbnail = await handleFileUpload(thumbnailFile, 'photo');
      }
    }

    // Handle optional files
    const videoFile = req.files.find(f => f.fieldname === 'videoFile');
    const resourcesFile = req.files.find(f => f.fieldname === 'resourcesFile');
    
    const videoUrl = videoFile ? await handleFileUpload(videoFile, 'video') : '';
    const resources = resourcesFile ? await handleFileUpload(resourcesFile, 'document') : '';

    // Parse and process chapters
    let chapters = [];
    try {
      chapters = JSON.parse(req.body.chapters || '[]');
    } catch (parseErr) {
      console.error('Error parsing chapters:', parseErr);
      return res.status(400).json({ message: 'Invalid chapters data' });
    }

    // Process module files for each chapter
    for (let i = 0; i < chapters.length; i++) {
      for (let j = 0; j < chapters[i].modules.length; j++) {
        chapters[i].modules[j] = await processModuleFiles(req, i, j, chapters[i].modules[j]);
      }
    }

    // Create and save course
    const course = new Course({
      title,
      shortDescription,
      longDescription,
      category,
      difficulty,
      featured: featured === 'true' || featured === true,
      thumbnail,
      videoUrl,
      resources,
      chapters
    });

    await course.save();
    res.status(201).json({ message: 'Course added successfully', course });

  } catch (err) {
    console.error('Error adding course:', err);
    res.status(500).json({ message: 'Server error while adding course' });
  }
});

// PUT update course (admin only) - Updated with Telegram integration
router.put('/:id', authMiddleware, upload.any(), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const {
      title,
      description, // Note: Assuming this is shortDescription
      longDescription,
      category,
      difficulty,
      featured
    } = req.body;

    // Update basic fields if provided
    if (title) course.title = title;
    if (description) course.shortDescription = description;
    if (longDescription) course.longDescription = longDescription;
    if (category) course.category = category;
    if (difficulty) course.difficulty = difficulty;
    if (featured !== undefined) course.featured = featured === 'true' || featured === true;

    // Handle thumbnail update
    const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnailFile');
    if (thumbnailFile) {
      course.thumbnail = await handleFileUpload(thumbnailFile, 'photo');
    }

    // Handle video update
    const videoFile = req.files.find(f => f.fieldname === 'videoFile');
    if (videoFile) {
      course.videoUrl = await handleFileUpload(videoFile, 'video');
    }

    // Handle resources update
    const resourcesFile = req.files.find(f => f.fieldname === 'resourcesFile');
    if (resourcesFile) {
      course.resources = await handleFileUpload(resourcesFile, 'document');
    }

    // Parse and update chapters
    let chapters = [];
    try {
      chapters = JSON.parse(req.body.chapters || '[]');
    } catch (parseErr) {
      console.error('Error parsing chapters:', parseErr);
      return res.status(400).json({ message: 'Invalid chapters data' });
    }

    // Process module files for each chapter
    for (let i = 0; i < chapters.length; i++) {
      for (let j = 0; j < chapters[i].modules.length; j++) {
        chapters[i].modules[j] = await processModuleFiles(req, i, j, chapters[i].modules[j]);
      }
    }
    course.chapters = chapters;

    await course.save();
    res.json({ message: 'Course updated successfully', course });

  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ message: 'Server error while updating course' });
  }
});

// DELETE course (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ message: 'Server error while deleting course' });
  }
});

module.exports = router;