const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const dotenv = require('dotenv');
const multer = require('multer');

dotenv.config();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'tmp/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Auth middleware (same as books)
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] }).lean();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add a new course (admin only) - OLD ROUTE
router.post('/', authMiddleware, upload.fields([{ name: 'thumbnail' }, { name: 'video' }]), async (req, res) => {
  try {
    const { title, description, modules } = req.body;
    const thumbnail = req.files?.thumbnail?.[0];
    const video = req.files?.video?.[0];

    if (!title || !description || !thumbnail || !video) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const thumbnailUrl = await uploadToTelegram(thumbnail, 'photo');
    const videoUrl = await uploadToTelegram(video, 'video');

    const parsedModules = JSON.parse(modules || '[]');
    const course = new Course({ title, description, thumbnail: thumbnailUrl, videoUrl, modules: parsedModules });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update a course (admin only)
router.put('/:id', authMiddleware, upload.fields([{ name: 'thumbnail' }, { name: 'video' }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, modules } = req.body;
    const thumbnail = req.files?.thumbnail?.[0];
    const video = req.files?.video?.[0];

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const updateData = { title, description, modules: JSON.parse(modules || '[]') };

    if (thumbnail) updateData.thumbnail = await uploadToTelegram(thumbnail, 'photo');
    if (video) updateData.videoUrl = await uploadToTelegram(video, 'video');

    const course = await Course.findByIdAndUpdate(id, updateData, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a course (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// NEW: Add Course with chapters + modules and file upload support
router.post("/add-course", authMiddleware, upload.any(), async (req, res) => {
  try {
    const { title, description, thumbnail, chapters } = req.body;
    const parsedChapters = JSON.parse(chapters || '[]');

    // Handle file uploads for modules
    for (const chap of parsedChapters) {
      for (const mod of chap.modules) {
        if (mod.type === 'file' && req.files) {
          // Upload files to Telegram if type is 'file'
          const thumbnailFile = req.files.find(f => f.originalname === mod.thumbnailFile);
          const videoFile = req.files.find(f => f.originalname === mod.videoFile);
          const resourcesFile = req.files.find(f => f.originalname === mod.resourcesFile);

          if (thumbnailFile) {
            mod.thumbnail = await uploadToTelegram(thumbnailFile, 'photo');
            fs.unlinkSync(thumbnailFile.path); // Clean up temp file
          }
          if (videoFile) {
            mod.videoUrl = await uploadToTelegram(videoFile, 'video');
            fs.unlinkSync(videoFile.path);
          }
          if (resourcesFile) {
            mod.resources = await uploadToTelegram(resourcesFile, 'document');
            fs.unlinkSync(resourcesFile.path);
          }
        }
        // For type 'link', values remain as provided in the form
      }
    }

    const newCourse = new Course({
      title,
      description,
      thumbnail,
      chapters: parsedChapters,
    });

    await newCourse.save();
    res.status(201).json({ message: "Course created successfully", course: newCourse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all courses
router.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get single course by ID
router.get("/api/courses/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Upload to Telegram (common function) - Enhanced for documents
async function uploadToTelegram(file, type) {
  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  form.append(type === 'document' ? 'document' : type, fs.createReadStream(file.path));
  
  let endpoint = 'sendPhoto';
  if (type === 'video') endpoint = 'sendVideo';
  if (type === 'document') endpoint = 'sendDocument';
  
  const response = await axios.post(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${endpoint}`,
    form,
    { headers: form.getHeaders() }
  );
  
  if (!response.data.ok) throw new Error('Failed to upload to Telegram');
  
  let fileId;
  if (type === 'photo') fileId = response.data.result.photo[response.data.result.photo.length - 1].file_id;
  else if (type === 'video') fileId = response.data.result.video.file_id;
  else if (type === 'document') fileId = response.data.result.document.file_id;
  
  const fileInfo = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
  if (!fileInfo.data.ok) throw new Error('Failed to get file from Telegram');
  
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.data.result.file_path}`;
}

module.exports = router;
