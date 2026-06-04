// ============================================================
// User Model
// ============================================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  // Student Profile
  profile: {
    class: { type: String, default: '' },
    category: {
      type: String,
      enum: ['SC', 'ST', 'BC', 'OBC', 'Minority', 'EWS', 'General', ''],
      default: ''
    },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    state: { type: String, default: '' },
    familyIncome: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    school: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  savedScholarships: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship'
  }],
  appliedScholarships: [{
    scholarship: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' },
    appliedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
  }],
  eligibilityHistory: [{
    checkedAt: { type: Date, default: Date.now },
    inputs: { type: Object },
    results: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' }]
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model('User', userSchema);