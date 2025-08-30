const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

// Multer setup for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'tmp/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Helper: upload a file to Telegram and return public URL
async function uploadToTelegram(file, type) {
  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  
  if (type === 'document') {
    form.append('document', fs.createReadStream(file.path));
  } else if (type === 'video') {
    form.append('video', fs.createReadStream(file.path));
  } else {
    form.append('photo', fs.createReadStream(file.path));
  }

  const endpoint =
    type === 'video'
      ? 'sendVideo'
      : type === 'document'
      ? 'sendDocument'
      : 'sendPhoto';

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${endpoint}`,
      form,
      { headers: form.getHeaders() }
    );

    if (!response.data.ok) {
      throw new Error('Upload to Telegram failed');
    }

    let fileId;
    if (type === 'photo') {
      fileId = response.data.result.photo.at(-1).file_id;
    } else if (type === 'video') {
      fileId = response.data.result.video.file_id;
    } else if (type === 'document') {
      fileId = response.data.result.document.file_id;
    }

    const fileInfoResp = await axios.get(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );

    if (!fileInfoResp.data.ok) {
      throw new Error('Failed to get file info from Telegram');
    }

    // Cleanup temp file
    fs.unlinkSync(file.path);

    return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfoResp.data.result.file_path}`;
  } catch (error) {
    // Cleanup temp file on error as well
    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
}

// GET all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).lean();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET specific course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    }).lean();
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST add course with files, modules, chapters
router.post(
  '/add-course',
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const { title, shortDescription, longDescription, category, difficulty, featured, thumbnailType } = req.body;
      if (!title) return res.status(400).json({ message: 'Title is required' });

      // Parse chapters JSON safely
      let parsedChapters = [];
      try {
        parsedChapters = JSON.parse(chapters || '[]');
      } catch {
        return res.status(400).json({ message: 'Invalid chapters JSON' });
      }

      // Upload main files to Telegram
      let thumbnailUrl = null, videoUrl = null, resourcesUrl = null;

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          if (file.fieldname === 'thumbnailFile') {
            thumbnailUrl = await uploadToTelegram(file, 'photo');
          } else if (file.fieldname === 'videoFile') {
            videoUrl = await uploadToTelegram(file, 'video');
          } else if (file.fieldname === 'resourcesFile') {
            resourcesUrl = await uploadToTelegram(file, 'document');
          }
        }
      }

      // Upload files for each module in chapters
      for (const chap of parsedChapters) {
        if (!Array.isArray(chap.modules)) continue;

        for (const mod of chap.modules) {
          if (mod.type === 'file' && req.files) {
            // Find files by matching the unique keys we generated in frontend
            for (const file of req.files) {
              if (file.fieldname.includes('thumbnailFile') && mod.thumbnail === file.fieldname) {
                mod.thumbnail = await uploadToTelegram(file, 'photo');
              } else if (file.fieldname.includes('videoFile') && mod.videoUrl === file.fieldname) {
                mod.videoUrl = await uploadToTelegram(file, 'video');
              } else if (file.fieldname.includes('resourcesFile') && mod.resources === file.fieldname) {
                mod.resources = await uploadToTelegram(file, 'document');
              }
            }
          }
        }
      }

      // Create and save course document
      const course = new Course({
        title,
        shortDescription,
        longDescription,
        category,
        thumbnail: thumbnailUrl,
        thumbnailType,
        videoUrl,
        resources,
        chapters: parsedChapters,
        featured,
        difficulty
      });

      await course.save();

      res.status(201).json({ message: 'Course created successfully', course });
    } catch (err) {
      console.error('Course creation error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// PUT update course with uploads
router.put(
  '/:id',
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, chapters } = req.body;

      if (!title) return res.status(400).json({ message: 'Title is required' });

      let parsedChapters = [];
      try {
        parsedChapters = JSON.parse(chapters || '[]');
      } catch {
        return res.status(400).json({ message: 'Invalid chapters JSON' });
      }

      const updates = { title, description };

      // Handle main course file uploads
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          if (file.fieldname === 'thumbnailFile') {
            updates.thumbnail = await uploadToTelegram(file, 'photo');
          } else if (file.fieldname === 'videoFile') {
            updates.videoUrl = await uploadToTelegram(file, 'video');
          } else if (file.fieldname === 'resourcesFile') {
            updates.resources = await uploadToTelegram(file, 'document');
          }
        }
      }

      // Upload files in modules
      for (const chap of parsedChapters) {
        if (!Array.isArray(chap.modules)) continue;

        for (const mod of chap.modules) {
          if (mod.type === 'file' && req.files) {
            for (const file of req.files) {
              if (file.fieldname.includes('thumbnailFile') && mod.thumbnail === file.fieldname) {
                mod.thumbnail = await uploadToTelegram(file, 'photo');
              } else if (file.fieldname.includes('videoFile') && mod.videoUrl === file.fieldname) {
                mod.videoUrl = await uploadToTelegram(file, 'video');
              } else if (file.fieldname.includes('resourcesFile') && mod.resources === file.fieldname) {
                mod.resources = await uploadToTelegram(file, 'document');
              }
            }
          }
        }
      }

      updates.chapters = parsedChapters;

      const course = await Course.findByIdAndUpdate(id, updates, { new: true });

      if (!course) return res.status(404).json({ message: 'Course not found' });

      res.json({ message: 'Course updated successfully', course });
    } catch (err) {
      console.error('Course update error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// DELETE course (soft delete)
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

module.exports = router;