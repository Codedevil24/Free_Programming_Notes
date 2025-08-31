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
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const uniqueName = `${timestamp}-${random}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 50 // Maximum 50 files per request
  },
  fileFilter: (req, file, cb) => {
    console.log(`ðŸ“ File received: ${file.fieldname} -> ${file.originalname} (${file.mimetype})`);
    
    // Allow all file types for flexibility
    cb(null, true);
  }
});

// Enhanced Authentication middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('âŒ Invalid or missing Authorization header');
    return res.status(401).json({ 
      message: 'Access denied. No valid token provided.',
      received: authHeader ? 'Invalid format' : 'No header'
    });
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('âœ… User authenticated:', decoded.user);
    next();
  } catch (err) {
    console.error('âŒ Token verification failed:', err.message);
    
    let message = 'Invalid token';
    if (err.name === 'TokenExpiredError') {
      message = 'Token expired. Please login again.';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
    }
    
    return res.status(401).json({ message });
  }
};

// Enhanced file upload helper
async function uploadFileToTelegram(file, type = 'document') {
  console.log(`ðŸ“¤ Starting ${type} upload to Telegram: ${file.originalname}`);
  
  // Validate file exists
  if (!fs.existsSync(file.path)) {
    throw new Error(`File not found at path: ${file.path}`);
  }

  // Check file size
  const stats = fs.statSync(file.path);
  if (stats.size === 0) {
    throw new Error(`File is empty: ${file.originalname}`);
  }

  console.log(`ðŸ“Š File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Validate Telegram credentials
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    throw new Error('Telegram credentials not configured in environment');
  }

  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);

  try {
    const fileStream = fs.createReadStream(file.path);
    
    // Handle different file types
    let endpoint, fieldName;
    
    if (type === 'photo' || file.mimetype?.startsWith('image/')) {
      endpoint = 'sendPhoto';
      fieldName = 'photo';
      form.append('photo', fileStream);
    } else if (type === 'video' || file.mimetype?.startsWith('video/')) {
      endpoint = 'sendVideo';
      fieldName = 'video';
      form.append('video', fileStream);
    } else {
      endpoint = 'sendDocument';
      fieldName = 'document';
      form.append('document', fileStream);
    }

    console.log(`ðŸš€ Uploading via ${endpoint}...`);

    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${endpoint}`,
      form,
      { 
        headers: form.getHeaders(),
        timeout: 180000, // 3 minutes timeout
        maxContentLength: 100 * 1024 * 1024, // 100MB
        maxBodyLength: 100 * 1024 * 1024
      }
    );

    if (!response.data.ok) {
      console.error('âŒ Telegram API returned error:', response.data);
      throw new Error(`Telegram upload failed: ${response.data.description || 'Unknown error'}`);
    }

    console.log('âœ… File uploaded to Telegram successfully');

    // Extract file_id based on response type
    let fileId;
    const result = response.data.result;
    
    if (result.photo) {
      fileId = result.photo[result.photo.length - 1].file_id; // Highest resolution
    } else if (result.video) {
      fileId = result.video.file_id;
    } else if (result.document) {
      fileId = result.document.file_id;
    } else {
      throw new Error('No file_id found in Telegram response');
    }

    console.log('ðŸ“‹ File ID:', fileId);

    // Get file path for public URL
    console.log('ðŸ” Getting file path from Telegram...');
    const fileInfoResponse = await axios.get(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
      { timeout: 30000 }
    );

    if (!fileInfoResponse.data.ok) {
      console.error('âŒ Failed to get file info:', fileInfoResponse.data);
      throw new Error('Failed to get file info from Telegram');
    }

    const publicUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfoResponse.data.result.file_path}`;
    console.log('ðŸŒ Public URL generated:', publicUrl);

    return publicUrl;

  } catch (error) {
    console.error(`âŒ Error uploading ${type} to Telegram:`, error.message);
    throw error;
  } finally {
    // Always clean up temp file
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log('ðŸ§¹ Cleaned up temp file:', file.path);
      }
    } catch (cleanupError) {
      console.error('âš ï¸ Cleanup error:', cleanupError.message);
    }
  }
}

// GET all courses
router.get('/', async (req, res) => {
  try {
    console.log('ðŸ“š Fetching all courses from database...');
    
    const query = {
      $or: [
        { isDeleted: false }, 
        { isDeleted: { $exists: false } }
      ]
    };

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    
    console.log(`âœ… Found ${courses.length} courses`);
    
    res.json(courses);
    
  } catch (err) {
    console.error('âŒ Error fetching courses:', err);
    res.status(500).json({ 
      message: 'Server error while fetching courses', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// GET specific course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('ðŸ” Fetching course with ID:', id);

    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    const course = await Course.findOne({
      _id: id,
      $or: [
        { isDeleted: false }, 
        { isDeleted: { $exists: false } }
      ]
    }).lean().exec();

    if (!course) {
      console.log('âŒ Course not found for ID:', id);
      return res.status(404).json({ message: 'Course not found' });
    }

    console.log('âœ… Course found:', course.title);
    res.json(course);

  } catch (err) {
    console.error('âŒ Error fetching course by ID:', err);
    res.status(500).json({ 
      message: 'Server error while fetching course', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// POST add new course with comprehensive file handling
router.post('/add-course', authMiddleware, upload.any(), async (req, res) => {
  console.log('\nðŸš€ ===== COURSE CREATION REQUEST =====');
  console.log('ðŸ“… Timestamp:', new Date().toISOString());
  console.log('ðŸ‘¤ User:', req.user?.user);
  console.log('ðŸ“ Body fields:', Object.keys(req.body));
  console.log('ðŸ“ Files received:', req.files?.length || 0);

  // Log all received files
  if (req.files && req.files.length > 0) {
    req.files.forEach((file, index) => {
      console.log(`ðŸ“„ File ${index + 1}: ${file.fieldname} -> ${file.originalname} (${file.size} bytes)`);
    });
  }

  try {
    // Extract form data
    const { 
      title, 
      shortDescription, 
      longDescription, 
      category, 
      difficulty, 
      featured, 
      thumbnailType,
      thumbnailUrl,
      chapters 
    } = req.body;

    console.log('ðŸ“‹ Course data received:');
    console.log('  ðŸ“ Title:', title || 'âŒ MISSING');
    console.log('  ðŸ“„ Short Description:', shortDescription ? 'âœ… PROVIDED' : 'âŒ MISSING');
    console.log('  ðŸ“š Category:', category || 'âŒ MISSING');
    console.log('  â­ Difficulty:', difficulty || 'Beginner (default)');
    console.log('  ðŸŒŸ Featured:', featured || false);
    console.log('  ðŸ–¼ï¸ Thumbnail Type:', thumbnailType || 'upload (default)');
    console.log('  ðŸ“Š Chapters:', chapters ? 'PROVIDED' : 'NONE');

    // Validate required fields
    const missingFields = [];
    if (!title?.trim()) missingFields.push('title');
    if (!shortDescription?.trim()) missingFields.push('shortDescription');
    if (!category?.trim()) missingFields.push('category');

    if (missingFields.length > 0) {
      console.log('âŒ Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Parse chapters safely
    let parsedChapters = [];
    if (chapters) {
      try {
        parsedChapters = JSON.parse(chapters);
        if (!Array.isArray(parsedChapters)) {
          parsedChapters = [];
        }
        console.log(`ðŸ“š Parsed ${parsedChapters.length} chapters successfully`);
        
        // Log chapter structure
        parsedChapters.forEach((chapter, chapterIndex) => {
          console.log(`  ðŸ“– Chapter ${chapterIndex + 1}: ${chapter.title || 'Untitled'}`);
          if (chapter.modules && Array.isArray(chapter.modules)) {
            chapter.modules.forEach((module, moduleIndex) => {
              console.log(`    ðŸ“„ Module ${moduleIndex + 1}: ${module.title || 'Untitled'} (${module.type || 'link'})`);
            });
          }
        });
        
      } catch (parseError) {
        console.error('âŒ Error parsing chapters JSON:', parseError);
        return res.status(400).json({ 
          message: 'Invalid chapters JSON format',
          error: parseError.message 
        });
      }
    }

    // Process file uploads
    console.log('\nðŸ“¤ ===== FILE UPLOAD PROCESSING =====');
    
    let courseData = {
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      longDescription: longDescription?.trim() || '',
      category: category.trim(),
      difficulty: difficulty || 'Beginner',
      featured: featured === 'true' || featured === true,
      thumbnailType: thumbnailType || 'upload',
      chapters: parsedChapters
    };

    // Handle thumbnail
    if (thumbnailType === 'url' && thumbnailUrl) {
      courseData.thumbnail = thumbnailUrl;
      console.log('ðŸ–¼ï¸ Using thumbnail URL:', thumbnailUrl);
    }

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      console.log('ðŸ”„ Processing uploaded files...');
      
      for (const file of req.files) {
        try {
          console.log(`\nâš¡ Processing: ${file.fieldname} -> ${file.originalname}`);
          
          // Main course files
          if (file.fieldname === 'thumbnailFile') {
            console.log('ðŸ–¼ï¸ Uploading course thumbnail...');
            courseData.thumbnail = await uploadFileToTelegram(file, 'photo');
            console.log('âœ… Course thumbnail uploaded');
            
          } else if (file.fieldname === 'videoFile') {
            console.log('ðŸŽ¥ Uploading course video...');
            courseData.videoUrl = await uploadFileToTelegram(file, 'video');
            console.log('âœ… Course video uploaded');
            
          } else if (file.fieldname === 'resourcesFile') {
            console.log('ðŸ“„ Uploading course resources...');
            courseData.resources = await uploadFileToTelegram(file, 'document');
            console.log('âœ… Course resources uploaded');
            
          } else if (file.fieldname.startsWith('chapter_') && file.fieldname.includes('_module_')) {
            // Parse module file naming: chapter_0_module_1_thumbnail
            const parts = file.fieldname.split('_');
            if (parts.length >= 5) {
              const chapterIndex = parseInt(parts[1]);
              const moduleIndex = parseInt(parts[3]);
              const fileType = parts[4]; // thumbnail, video, or resources
              
              console.log(`ðŸ“š Processing module file: Chapter ${chapterIndex}, Module ${moduleIndex}, Type: ${fileType}`);
              
              if (parsedChapters[chapterIndex] && 
                  parsedChapters[chapterIndex].modules && 
                  parsedChapters[chapterIndex].modules[moduleIndex]) {
                
                let uploadType = 'document';
                if (fileType === 'thumbnail') uploadType = 'photo';
                else if (fileType === 'video') uploadType = 'video';
                
                const fileUrl = await uploadFileToTelegram(file, uploadType);
                
                // Update the module data
                const module = parsedChapters[chapterIndex].modules[moduleIndex];
                if (fileType === 'thumbnail') {
                  module.thumbnail = fileUrl;
                } else if (fileType === 'video') {
                  module.videoUrl = fileUrl;
                } else if (fileType === 'resources') {
                  module.resources = fileUrl;
                }
                
                console.log(`âœ… Module ${fileType} uploaded and linked`);
              } else {
                console.log('âš ï¸ Module not found in parsed chapters, skipping file');
              }
            } else {
              console.log('âš ï¸ Invalid module file naming format:', file.fieldname);
            }
          } else {
            console.log('âš ï¸ Unknown file field:', file.fieldname);
          }
          
        } catch (uploadError) {
          console.error(`âŒ Failed to upload ${file.fieldname}:`, uploadError.message);
          
          // Clean up remaining temp files
          if (req.files) {
            req.files.forEach(f => {
              if (fs.existsSync(f.path)) {
                try {
                  fs.unlinkSync(f.path);
                } catch (cleanupErr) {
                  console.error('Cleanup error:', cleanupErr);
                }
              }
            });
          }
          
          return res.status(500).json({ 
            message: `Failed to upload ${file.fieldname}: ${uploadError.message}`,
            error: uploadError.message 
          });
        }
      }
    }

    // Update courseData with processed chapters
    courseData.chapters = parsedChapters;

    console.log('\nðŸ’¾ ===== SAVING TO DATABASE =====');
    console.log('ðŸ“Š Final course data:');
    console.log('  ðŸ“ Title:', courseData.title);
    console.log('  ðŸ“š Category:', courseData.category);
    console.log('  ðŸ–¼ï¸ Thumbnail:', courseData.thumbnail ? 'SET' : 'NOT SET');
    console.log('  ðŸŽ¥ Video URL:', courseData.videoUrl ? 'SET' : 'NOT SET');
    console.log('  ðŸ“„ Resources:', courseData.resources ? 'SET' : 'NOT SET');
    console.log('  ðŸ“– Chapters:', courseData.chapters.length);

    // Save to MongoDB
    const course = new Course(courseData);
    const savedCourse = await course.save();

    console.log('âœ… Course saved successfully to MongoDB!');
    console.log('ðŸ†” Course ID:', savedCourse._id);

    res.status(201).json({ 
      message: 'Course created successfully!', 
      course: savedCourse,
      id: savedCourse._id
    });

  } catch (err) {
    console.error('\nâŒ ===== COURSE CREATION ERROR =====');
    console.error('Error message:', err.message);
    console.error('Stack trace:', err.stack);
    
    // Clean up any remaining temp files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
            console.log('ðŸ§¹ Cleaned up temp file:', file.path);
          } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr.message);
          }
        }
      });
    }
    
    // Handle specific error types
    let statusCode = 500;
    let message = 'Server error during course creation';
    
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Course validation failed';
    } else if (err.code === 11000) {
      statusCode = 409;
      message = 'Course with this title already exists';
    }
    
    res.status(statusCode).json({ 
      message,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// PUT update course
router.put('/:id', authMiddleware, upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('ðŸ”„ Updating course:', id);

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    const { title, shortDescription, longDescription, category, difficulty, featured, chapters } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Parse chapters if provided
    let parsedChapters;
    if (chapters) {
      try {
        parsedChapters = JSON.parse(chapters);
        if (!Array.isArray(parsedChapters)) {
          parsedChapters = [];
        }
      } catch (parseError) {
        return res.status(400).json({ 
          message: 'Invalid chapters JSON format',
          error: parseError.message 
        });
      }
    }

    const updateData = {
      title: title.trim(),
      shortDescription: shortDescription?.trim() || '',
      longDescription: longDescription?.trim() || '',
      category: category?.trim(),
      difficulty: difficulty || 'Beginner',
      featured: featured === 'true' || featured === true
    };

    if (parsedChapters !== undefined) {
      updateData.chapters = parsedChapters;
    }

    // Handle file uploads for update
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          if (file.fieldname === 'thumbnailFile') {
            updateData.thumbnail = await uploadFileToTelegram(file, 'photo');
          } else if (file.fieldname === 'videoFile') {
            updateData.videoUrl = await uploadFileToTelegram(file, 'video');
          } else if (file.fieldname === 'resourcesFile') {
            updateData.resources = await uploadFileToTelegram(file, 'document');
          }
        } catch (uploadError) {
          console.error(`Error uploading ${file.fieldname}:`, uploadError);
          return res.status(500).json({ 
            message: `Failed to upload ${file.fieldname}`,
            error: uploadError.message 
          });
        }
      }
    }

    const updatedCourse = await Course.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true 
    });

    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    console.log('âœ… Course updated successfully:', updatedCourse._id);
    res.json({ 
      message: 'Course updated successfully', 
      course: updatedCourse 
    });

  } catch (err) {
    console.error('Course update error:', err);
    
    // Clean up temp files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
          }
        }
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during course update', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// DELETE course (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('ðŸ—‘ï¸ Deleting course:', id);

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    const course = await Course.findByIdAndUpdate(
      id, 
      { isDeleted: true }, 
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    console.log('âœ… Course deleted successfully:', id);
    res.json({ 
      message: 'Course deleted successfully',
      courseId: id 
    });

  } catch (err) {
    console.error('Course deletion error:', err);
    res.status(500).json({ 
      message: 'Server error during course deletion', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    config: {
      telegramBot: process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'âŒ Missing',
      telegramChat: process.env.TELEGRAM_CHAT_ID ? 'Configured' : 'âŒ Missing',
      jwtSecret: process.env.JWT_SECRET ? 'Configured' : 'âŒ Missing'
    }
  });
});

module.exports = router;