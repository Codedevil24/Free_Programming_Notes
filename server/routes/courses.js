// server/routes/courses.js
const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

// Enhanced Multer setup with better error handling
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mp3|zip|rar|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = /image|video|application/.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

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

// Enhanced Telegram upload with retry mechanism
async function uploadToTelegram(file, type) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    throw new Error('Telegram credentials not configured');
  }

  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  
  if (type === 'document') {
    form.append('document', fs.createReadStream(file.path));
  } else if (type === 'video') {
    form.append('video', fs.createReadStream(file.path));
  } else {
    form.append('photo', fs.createReadStream(file.path));
  }

  const endpoint = type === 'video' ? 'sendVideo' : type === 'document' ? 'sendDocument' : 'sendPhoto';

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${endpoint}`,
      form,
      { 
        headers: form.getHeaders(),
        timeout: 30000
      }
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
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
      { timeout: 10000 }
    );

    if (!fileInfoResp.data.ok) {
      throw new Error('Failed to get file info from Telegram');
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfoResp.data.result.file_path}`;
    
    // Cleanup temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    return fileUrl;
  } catch (error) {
    console.error('Telegram upload error:', error.message);
    // Cleanup temp file on error
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
    }).sort({ createdAt: -1 }).lean();
    
    res.json(courses);
  } catch (err) {
    console.error('Fetch courses error:', err);
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
    console.error('Fetch course error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST add course with complete fixes
router.post(
  '/add-course',
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      console.log('Received course upload request');
      console.log('Body:', req.body);
      console.log('Files:', req.files?.length || 0);

      const { 
        title, 
        shortDescription, 
        longDescription, 
        category, 
        difficulty, 
        featured, 
        thumbnailType,
        thumbnailUrl, // Added for URL option
        chapters: chaptersString 
      } = req.body;

      // Enhanced validation
      if (!title?.trim()) {
        return res.status(400).json({ success: false, message: 'Title is required' });
      }
      if (!shortDescription?.trim()) {
        return res.status(400).json({ success: false, message: 'Short description is required' });
      }
      if (!category?.trim()) {
        return res.status(400).json({ success: false, message: 'Category is required' });
      }

      // Parse chapters JSON safely
      let parsedChapters = [];
      try {
        parsedChapters = JSON.parse(chaptersString || '[]');
        console.log('Parsed chapters:', parsedChapters.length);
      } catch (parseError) {
        console.error('Chapters parse error:', parseError);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid chapters format. Please check your chapter data.' 
        });
      }

      // Process main course files
      let thumbnailUrlFinal = thumbnailUrl || null;
      let videoUrl = null, resourcesUrl = null;

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            if (file.fieldname === 'thumbnailFile' && thumbnailType !== 'url') {
              thumbnailUrlFinal = await uploadToTelegram(file, 'photo');
            } else if (file.fieldname === 'videoFile') {
              videoUrl = await uploadToTelegram(file, 'video');
            } else if (file.fieldname === 'resourcesFile') {
              resourcesUrl = await uploadToTelegram(file, 'document');
            }
          } catch (uploadError) {
            console.error(`File upload error for ${file.fieldname}:`, uploadError.message);
            // Continue without this file if upload fails
          }
        }
      }

      // Process chapter module files
      const processedChapters = [];
      for (let chapterIndex = 0; chapterIndex < parsedChapters.length; chapterIndex++) {
        const chapter = parsedChapters[chapterIndex];
        const processedModules = [];

        if (Array.isArray(chapter.modules)) {
          for (let moduleIndex = 0; moduleIndex < chapter.modules.length; moduleIndex++) {
            const module = { ...chapter.modules[moduleIndex] };
            
            if (module.type === 'file' && req.files) {
              // Find matching files for this module
              const chapterKey = `chapter_${chapterIndex}_module_${moduleIndex}`;
              
              for (const file of req.files) {
                if (file.fieldname === `${chapterKey}_thumb`) {
                  try {
                    module.thumbnail = await uploadToTelegram(file, 'photo');
                  } catch (e) {
                    console.error('Thumbnail upload error:', e.message);
                    module.thumbnail = null;
                  }
                } else if (file.fieldname === `${chapterKey}_video`) {
                  try {
                    module.videoUrl = await uploadToTelegram(file, 'video');
                  } catch (e) {
                    console.error('Video upload error:', e.message);
                    module.videoUrl = null;
                  }
                } else if (file.fieldname === `${chapterKey}_resources`) {
                  try {
                    module.resources = await uploadToTelegram(file, 'document');
                  } catch (e) {
                    console.error('Resources upload error:', e.message);
                    module.resources = null;
                  }
                }
              }
            }
            
            processedModules.push(module);
          }
        }

        processedChapters.push({
          title: chapter.title || `Chapter ${chapterIndex + 1}`,
          modules: processedModules
        });
      }

      // Create course document
      const course = new Course({
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        longDescription: longDescription?.trim() || '',
        category: category.trim(),
        thumbnail: thumbnailUrlFinal,
        thumbnailType: thumbnailType || 'upload',
        videoUrl,
        resources: resourcesUrl,
        chapters: processedChapters,
        featured: featured === 'true' || featured === true,
        difficulty: difficulty || 'Beginner'
      });

      await course.save();
      console.log('Course saved successfully:', course._id);

      res.status(201).json({ 
        success: true, 
        message: 'Course created successfully', 
        courseId: course._id,
        course 
      });

    } catch (err) {
      console.error('Course creation error:', err);
      
      // Cleanup any remaining files
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: err.message 
      });
    }
  }
);

// PUT update course with fixes
router.put(
  '/:id',
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        title, 
        shortDescription, 
        longDescription, 
        category, 
        difficulty, 
        featured, 
        thumbnailType,
        thumbnailUrl, // Added for URL option
        chapters: chaptersString 
      } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ success: false, message: 'Title is required' });
      }

      let parsedChapters = [];
      try {
        parsedChapters = JSON.parse(chaptersString || '[]');
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid chapters JSON' });
      }

      const updates = { 
        title: title.trim(), 
        shortDescription: shortDescription?.trim() || '',
        longDescription: longDescription?.trim() || '',
        category: category?.trim() || '',
        difficulty: difficulty || 'Beginner',
        featured: featured === 'true' || featured === true
      };

      // Handle course-level file uploads
      let thumbnailUrlFinal = thumbnailUrl || null;
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            if (file.fieldname === 'thumbnailFile' && thumbnailType !== 'url') {
              updates.thumbnail = await uploadToTelegram(file, 'photo');
            } else if (file.fieldname === 'videoFile') {
              updates.videoUrl = await uploadToTelegram(file, 'video');
            } else if (file.fieldname === 'resourcesFile') {
              updates.resources = await uploadToTelegram(file, 'document');
            }
          } catch (uploadError) {
            console.error('File upload error:', uploadError.message);
          }
        }
      }

      // Process chapter module files (similar to POST)
      const processedChapters = [];
      for (let chapterIndex = 0; chapterIndex < parsedChapters.length; chapterIndex++) {
        const chapter = parsedChapters[chapterIndex];
        const processedModules = [];

        if (Array.isArray(chapter.modules)) {
          for (let moduleIndex = 0; moduleIndex < chapter.modules.length; moduleIndex++) {
            const module = { ...chapter.modules[moduleIndex] };
            
            if (module.type === 'file' && req.files) {
              // Find matching files for this module
              const chapterKey = `chapter_${chapterIndex}_module_${moduleIndex}`;
              
              for (const file of req.files) {
                if (file.fieldname === `${chapterKey}_thumb`) {
                  try {
                    module.thumbnail = await uploadToTelegram(file, 'photo');
                  } catch (e) {
                    console.error('Thumbnail upload error:', e.message);
                    module.thumbnail = module.thumbnail || null; // Keep existing if not new
                  }
                } else if (file.fieldname === `${chapterKey}_video`) {
                  try {
                    module.videoUrl = await uploadToTelegram(file, 'video');
                  } catch (e) {
                    console.error('Video upload error:', e.message);
                    module.videoUrl = module.videoUrl || null;
                  }
                } else if (file.fieldname === `${chapterKey}_resources`) {
                  try {
                    module.resources = await uploadToTelegram(file, 'document');
                  } catch (e) {
                    console.error('Resources upload error:', e.message);
                    module.resources = module.resources || null;
                  }
                }
              }
            }
            
            processedModules.push(module);
          }
        }

        processedChapters.push({
          title: chapter.title || `Chapter ${chapterIndex + 1}`,
          modules: processedModules
        });
      }

      updates.chapters = processedChapters;

      const course = await Course.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      res.json({ 
        success: true, 
        message: 'Course updated successfully', 
        course 
      });
    } catch (err) {
      console.error('Course update error:', err);
      
      // Cleanup any remaining files
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: err.message 
      });
    }
  }
);

// DELETE course (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndUpdate(
      id, 
      { isDeleted: true }, 
      { new: true }
    );
    
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Course deleted successfully' 
    });
  } catch (err) {
    console.error('Course delete error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

module.exports = router;