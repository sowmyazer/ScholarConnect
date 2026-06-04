// ============================================================
// Scholarship Model
// ============================================================
const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Scholarship name is required'],
    trim: true,
    maxlength: [200, 'Name too long']
  },
  category: {
    type: [String],
    enum: ['SC', 'ST', 'BC', 'OBC', 'Minority', 'EWS', 'General', 'Merit', 'Girls'],
    required: true
  },
  gender: {
    type: String,
    enum: ['All', 'Male', 'Female'],
    default: 'All'
  },
  amount: {
    type: Number,
    required: [true, 'Scholarship amount is required'],
    min: 0
  },
  amountDescription: {
    type: String,
    default: ''
  },
  eligibility: {
    type: String,
    required: [true, 'Eligibility criteria is required']
  },
  eligibilityCriteria: {
    minClass: { type: Number, default: 1 },
    maxClass: { type: Number, default: 12 },
    minPercentage: { type: Number, default: 0 },
    minFamilyIncome: { type: Number, default: 0 },
    maxFamilyIncome: { type: Number, default: 1000000 }
  },
  incomeLimit: {
    type: Number,
    default: 0
  },
  state: {
    type: [String],
    default: ['All India']
  },
  documents: {
    type: [String],
    default: []
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  officialLink: {
    type: String,
    default: '#'
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  benefits: {
    type: String,
    default: ''
  },
  applicationProcess: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  applicants: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Text index for search
scholarshipSchema.index({
  name: 'text',
  description: 'text',
  eligibility: 'text'
});

// Virtual for days remaining
scholarshipSchema.virtual('daysRemaining').get(function () {
  const now = new Date();
  const diff = this.deadline - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

scholarshipSchema.virtual('isExpired').get(function () {
  return new Date() > this.deadline;
});

scholarshipSchema.set('toJSON', { virtuals: true });
scholarshipSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Scholarship', scholarshipSchema);