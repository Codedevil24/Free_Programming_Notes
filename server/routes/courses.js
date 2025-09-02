/*  server/routes/courses.js  –  COMPLETE & FIXED  */
const express = require('express');
const router  = express.Router();
const Course  = require('../models/Course');
const jwt     = require('jsonwebtoken');
const axios   = require('axios');
const FormData= require('form-data');
const fs      = require('fs');
const multer  = require('multer');
require('dotenv').config();

/* ---------- Multer setup ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'tmp/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1500 * 1024 * 1024 }, //limit 1500 mb
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|mp4|mkv|mp3|zip|7z|rar|doc|docx/;
    if (allowed.test(file.originalname.toLowerCase()) && /image|video|application/.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

/* ---------- Auth middleware ---------- */
function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/* ---------- Telegram upload helper ---------- */
async function uploadToTelegram(file, type) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    throw new Error('Telegram credentials not configured');
  }
  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  const endpoint = type === 'video' ? 'sendVideo' : type === 'document' ? 'sendDocument' : 'sendPhoto';
  form.append(
    type === 'video' ? 'video' : type === 'document' ? 'document' : 'photo',
    fs.createReadStream(file.path)
  );

  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${endpoint}`,
      form,
      { headers: form.getHeaders(), timeout: 30000 }
    );
    if (!res.data.ok) throw new Error('Upload to Telegram failed');

    let fileId =
      type === 'photo'
        ? res.data.result.photo.at(-1).file_id
        : type === 'video'
        ? res.data.result.video.file_id
        : res.data.result.document.file_id;

    const info = await axios.get(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
      { timeout: 10000 }
    );
    if (!info.data.ok) throw new Error('Failed to get file info');

    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${info.data.result.file_path}`;
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return url;
  } catch (err) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw err;
  }
}

/* ---------- Routes ---------- */

// GET /api/courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ createdAt: -1 }).lean();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/courses/:id
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/courses/add-course
router.post(
  '/add-course',
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const {
        title,
        shortDescription,
        longDescription,
        category,
        difficulty,
        featured,
        chapters: chaptersString,
      } = req.body;

      if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
      if (!shortDescription?.trim()) return res.status(400).json({ success: false, message: 'Short description is required' });
      if (!category?.trim()) return res.status(400).json({ success: false, message: 'Category is required' });

      let parsedChapters = [];
      try {
        parsedChapters = JSON.parse(chaptersString || '[]');
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid chapters format' });
      }

      let thumbnailUrl = null, videoUrl = null, resourcesUrl = null;
      if (req.files) {
        for (const file of req.files) {
          try {
            if (file.fieldname === 'thumbnailFile') thumbnailUrl = await uploadToTelegram(file, 'photo');
            else if (file.fieldname === 'videoFile') videoUrl = await uploadToTelegram(file, 'video');
            else if (file.fieldname === 'resourcesFile') resourcesUrl = await uploadToTelegram(file, 'document');
          } catch (e) {
            console.error(`Upload skipped for ${file.fieldname}:`, e.message);
          }
        }
      }

      const processedChapters = [];
      for (let chIdx = 0; chIdx < parsedChapters.length; chIdx++) {
        const chapter = parsedChapters[chIdx];
        const processedModules = [];

        if (Array.isArray(chapter.modules)) {
          for (let modIdx = 0; modIdx < chapter.modules.length; modIdx++) {
            const module = { ...chapter.modules[modIdx] };
            if (module.type === 'file' && req.files) {
              for (const file of req.files) {
                if (file.fieldname === `chapter_${chIdx}_module_${modIdx}_thumb`) {
                  module.thumbnail = await uploadToTelegram(file, 'photo');
                } else if (file.fieldname === `chapter_${chIdx}_module_${modIdx}_video`) {
                  module.videoUrl = await uploadToTelegram(file, 'video');
                } else if (file.fieldname === `chapter_${chIdx}_module_${modIdx}_resources`) {
                  module.resources = await uploadToTelegram(file, 'document');
                }
              }
            }
            processedModules.push(module);
          }
        }
        processedChapters.push({
          title: chapter.title || `Chapter ${chIdx + 1}`,
          modules: processedModules,
        });
      }

      const course = new Course({
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        longDescription: longDescription?.trim() || '',
        category: category.trim(),
        thumbnail: thumbnailUrl,
        videoUrl,
        resources: resourcesUrl,
        chapters: processedChapters,
        featured: featured === 'true' || featured === true,
        difficulty: difficulty || 'Beginner',
      });

      await course.save();
      res.status(201).json({ success: true, message: 'Course created', courseId: course._id, course });
    } catch (err) {
      if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  }
);

// PUT /api/courses/:id
router.put(
  '/:id',
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, chapters: chaptersString } = req.body;
      if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

      let parsedChapters = [];
      try {
        parsedChapters = JSON.parse(chaptersString || '[]');
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid chapters JSON' });
      }

      const updates = {
        title: title.trim(),
        shortDescription: description?.trim() || '',
        longDescription: req.body.longDescription?.trim() || '',
      };

      if (req.files) {
        for (const file of req.files) {
          try {
            if (file.fieldname === 'thumbnailFile') updates.thumbnail = await uploadToTelegram(file, 'photo');
            else if (file.fieldname === 'videoFile') updates.videoUrl = await uploadToTelegram(file, 'video');
            else if (file.fieldname === 'resourcesFile') updates.resources = await uploadToTelegram(file, 'document');
          } catch (e) {
            console.error(`Upload skipped for ${file.fieldname}:`, e.message);
          }
        }
      }

      updates.chapters = parsedChapters;
      const course = await Course.findByIdAndUpdate(id, updates, { new: true });
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      res.json({ success: true, message: 'Course updated', course });
    } catch (err) {
      if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  }
);

// DELETE /api/courses/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
