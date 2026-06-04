// ============================================================
// Notification Model
// ============================================================
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required']
  },
  type: {
    type: String,
    enum: ['new_scholarship', 'deadline', 'announcement', 'update'],
    default: 'announcement'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  link: {
    type: String,
    default: ''
  },
  scholarship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

// ============================================================
// Contact Model
// ============================================================
const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name too long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  subject: {
    type: String,
    default: 'General Inquiry',
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [2000, 'Message too long']
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'replied'],
    default: 'unread'
  },
  reply: {
    type: String,
    default: ''
  },
  repliedAt: { type: Date }
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = { Notification, Contact };