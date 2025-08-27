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
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

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

// FIXED: POST add course with proper chapter handling and file processing
router.post(
  '/add-course',
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const { title, description, chapters } = req.body;
      console.log('Received course data:', { title, description, chaptersLength: chapters?.length });
      
      if (!title) return res.status(400).json({ message: 'Title is required' });

      // FIXED: Parse chapters JSON safely with better error handling
      let parsedChapters = [];
      try {
        parsedChapters = JSON.parse(chapters || '[]');
        console.log('Parsed chapters:', parsedChapters.length);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return res.status(400).json({ message: 'Invalid chapters JSON format' });
      }

      const files = req.files || [];
      console.log('Processing files:', files.length);

      // Upload main course files
      let thumbnailUrl = null, videoUrl = null, resourcesUrl = null;

      const mainThumb = files.find(f => f.fieldname === 'thumbnailFile');
      const mainVideo = files.find(f => f.fieldname === 'videoFile');
      const mainResources = files.find(f => f.fieldname === 'resourcesFile');

      if (mainThumb) {
        console.log('Uploading main thumbnail...');
        thumbnailUrl = await uploadToTelegram(mainThumb, 'photo');
      }
      if (mainVideo) {
        console.log('Uploading main video...');
        videoUrl = await uploadToTelegram(mainVideo, 'video');
      }
      if (mainResources) {
        console.log('Uploading main resources...');
        resourcesUrl = await uploadToTelegram(mainResources, 'document');
      }

      // FIXED: Process module files with improved matching logic
      for (const chapter of parsedChapters) {
        if (!Array.isArray(chapter.modules)) continue;

        for (const mod of chapter.modules) {
          if (mod.type === 'file' && files.length > 0) {
            console.log('Processing module files for:', mod.title);
            
            // FIXED: Better file matching using both fieldname and filename patterns
            const thumbFile = files.find(f => 
              f.fieldname === mod.thumbnail || 
              f.originalname === mod.thumbnail ||
              f.fieldname.includes('thumb') && f.fieldname.includes(mod.title?.replace(/\s+/g, ''))
            );
            const videoFile = files.find(f => 
              f.fieldname === mod.videoUrl || 
              f.originalname === mod.videoUrl ||
              f.fieldname.includes('video') && f.fieldname.includes(mod.title?.replace(/\s+/g, ''))
            );
            const resFile = files.find(f => 
              f.fieldname === mod.resources || 
              f.originalname === mod.resources ||
              f.fieldname.includes('resources') && f.fieldname.includes(mod.title?.replace(/\s+/g, ''))
            );

            if (thumbFile) {
              mod.thumbnail = await uploadToTelegram(thumbFile, 'photo');
              console.log('Uploaded module thumbnail');
            }
            if (videoFile) {
              mod.videoUrl = await uploadToTelegram(videoFile, 'video');
              console.log('Uploaded module video');
            }
            if (resFile) {
              mod.resources = await uploadToTelegram(resFile, 'document');
              console.log('Uploaded module resources');
            }
          }
        }
      }

      // Create and save course document
      const course = new Course({
        title,
        description: description || '',
        thumbnail: thumbnailUrl,
        videoUrl,
        resources: resourcesUrl,
        chapters: parsedChapters,
      });

      await course.save();
      console.log('Course saved to MongoDB successfully');

      res.status(201).json({ message: 'Course created successfully', course });
    } catch (err) {
      console.error('Course creation error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// FIXED: PUT update course with improved file handling
router.put(
  '/:id',
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, chapters } = req.body;

      if (!title) return res.status(400).json({ message: 'Title is required' });

      // FIXED: Parse chapters JSON safely
      let parsedChapters = [];
      try {
        parsedChapters = JSON.parse(chapters || '[]');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return res.status(400).json({ message: 'Invalid chapters JSON format' });
      }

      const updates = { title, description: description || '' };
      const files = req.files || [];

      // Upload new main files if provided
      const mainThumb = files.find(f => f.fieldname === 'thumbnailFile');
      const mainVideo = files.find(f => f.fieldname === 'videoFile');
      const mainResources = files.find(f => f.fieldname === 'resourcesFile');

      if (mainThumb) {
        updates.thumbnail = await uploadToTelegram(mainThumb, 'photo');
      }
      if (mainVideo) {
        updates.videoUrl = await uploadToTelegram(mainVideo, 'video');
      }
      if (mainResources) {
        updates.resources = await uploadToTelegram(mainResources, 'document');
      }

      // Process module files in chapters
      for (const chapter of parsedChapters) {
        if (!Array.isArray(chapter.modules)) continue;

        for (const mod of chapter.modules) {
          if (mod.type === 'file' && files.length > 0) {
            const thumbFile = files.find(f => 
              f.fieldname === mod.thumbnail || f.originalname === mod.thumbnail
            );
            const videoFile = files.find(f => 
              f.fieldname === mod.videoUrl || f.originalname === mod.videoUrl
            );
            const resFile = files.find(f => 
              f.fieldname === mod.resources || f.originalname === mod.resources
            );

            if (thumbFile) {
              mod.thumbnail = await uploadToTelegram(thumbFile, 'photo');
            }
            if (videoFile) {
              mod.videoUrl = await uploadToTelegram(videoFile, 'video');
            }
            if (resFile) {
              mod.resources = await uploadToTelegram(resFile, 'document');
            }
          }
        }
      }

      updates.chapters = parsedChapters;

      const course = await Course.findByIdAndUpdate(id, updates, { new: true });

      if (!course) return res.status(404).json({ message: 'Course not found' });

      console.log('Course updated successfully');
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
    console.log('Soft deleting course with ID:', id);
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    const course = await Course.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    console.log('Course soft deleted:', id);
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
