const mongoose = require('mongoose');

// Module/Lecture sub-document
const moduleSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [200, 'Module title cannot exceed 200 characters']
  },
  type: { 
    type: String, 
    enum: ['file', 'link'], 
    default: 'link' 
  },
  thumbnail: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid thumbnail URL format'
    }
  },
  videoUrl: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+$/i.test(v);
      },
      message: 'Invalid video URL format'
    }
  },
  resources: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+$/i.test(v);
      },
      message: 'Invalid resources URL format'
    }
  },
  notes: { 
    type: String,
    maxlength: [5000, 'Notes cannot exceed 5000 characters']
  }
}, { _id: false });

// Chapter sub-document
const chapterSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [200, 'Chapter title cannot exceed 200 characters']
  },
  modules: { 
    type: [moduleSchema], 
    default: [],
    validate: [v => v.length <= 50, 'Maximum 50 modules per chapter']
  }
}, { _id: false });

// Enhanced Course schema
const courseSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    index: true,
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters']
  },
  shortDescription: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  longDescription: { 
    type: String,
    trim: true,
    maxlength: [5000, 'Long description cannot exceed 5000 characters']
  },
  category: { 
    type: String, 
    required: true,
    index: true,
    enum: [
      'Programming', 'Algorithms', 'Data Science', 'Web Development',
      'Mobile Development', 'DevOps', 'AI/ML', 'Cybersecurity'
    ]
  },
  thumbnail: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid thumbnail URL format'
    }
  },
  thumbnailType: { 
    type: String, 
    enum: ['link', 'upload'], 
    default: 'upload' 
  },
  videoUrl: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+$/i.test(v);
      },
      message: 'Invalid video URL format'
    }
  },
  resources: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+$/i.test(v);
      },
      message: 'Invalid resources URL format'
    }
  },
  chapters: { 
    type: [chapterSchema], 
    default: [],
    validate: [v => v.length <= 20, 'Maximum 20 chapters per course']
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  featured: { 
    type: Boolean, 
    default: false 
  },
  difficulty: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced'], 
    default: 'Beginner' 
  }
}, {
  timestamps: true
});

// Indexes for better query performance
courseSchema.index({ category: 1, difficulty: 1 });
courseSchema.index({ featured: 1, createdAt: -1 });
courseSchema.index({ title: 'text', shortDescription: 'text', longDescription: 'text' });

module.exports = mongoose.model('Course', courseSchema);
