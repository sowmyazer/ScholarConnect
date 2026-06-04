// ============================================================
// Scholarship Controller
// ============================================================
const Scholarship = require('../models/Scholarship');

// @desc    Get all scholarships with filters & pagination
// @route   GET /api/scholarships
const getScholarships = async (req, res) => {
  try {
    const {
      search, category, gender, state, minAmount, maxAmount,
      classLevel, active, featured, page = 1, limit = 12, sort = '-createdAt'
    } = req.query;

    const query = { isApproved: true };

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (category) query.category = { $in: category.split(',') };
    if (gender && gender !== 'All') query.gender = { $in: ['All', gender] };
    if (state) query.state = { $in: ['All India', state] };
    
    if (active === 'true') {
  query.$or = [
    { deadline: { $gte: new Date() } },
    { deadline: { $exists: false } },
    { deadline: null }
  ];
}
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }
    if (classLevel) {
      query['eligibilityCriteria.minClass'] = { $lte: Number(classLevel) };
      query['eligibilityCriteria.maxClass'] = { $gte: Number(classLevel) };
    }

    const total = await Scholarship.countDocuments(query);
    const scholarships = await Scholarship.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean({ virtuals: true });

    res.json({
      success: true,
      count: scholarships.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      scholarships
    });
  } catch (error) {
    console.error('getScholarships error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Get single scholarship
// @route   GET /api/scholarships/:id
const getScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id).lean({ virtuals: true });
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }

    // Increment view count
    await Scholarship.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({ success: true, scholarship });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Create scholarship (Admin)
// @route   POST /api/scholarships
const createScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.create({
      ...req.body,
      createdBy: req.user._id,
      isApproved: req.user.role === 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Scholarship created successfully!',
      scholarship
    });
  } catch (error) {
    console.error('createScholarship error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update scholarship (Admin)
// @route   PUT /api/scholarships/:id
const updateScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }

    res.json({ success: true, message: 'Scholarship updated!', scholarship });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete scholarship (Admin)
// @route   DELETE /api/scholarships/:id
const deleteScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findByIdAndDelete(req.params.id);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }
    res.json({ success: true, message: 'Scholarship deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Get statistics
// @route   GET /api/scholarships/stats
const getStats = async (req, res) => {
  try {
    const now = new Date();
    const [total, active, upcoming] = await Promise.all([
      Scholarship.countDocuments({ isApproved: true }),
      Scholarship.countDocuments({ isApproved: true, deadline: { $gte: now } }),
      Scholarship.countDocuments({
        isApproved: true,
        deadline: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    const User = require('../models/User');
    const registeredStudents = await User.countDocuments({ role: 'student' });

    res.json({
      success: true,
      stats: { total, active, upcoming, registeredStudents }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Save / unsave scholarship for student
// @route   POST /api/scholarships/:id/save
const toggleSave = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const scholarshipId = req.params.id;

    const idx = user.savedScholarships.indexOf(scholarshipId);
    let saved;
    if (idx === -1) {
      user.savedScholarships.push(scholarshipId);
      saved = true;
    } else {
      user.savedScholarships.splice(idx, 1);
      saved = false;
    }
    await user.save();
    res.json({ success: true, saved, message: saved ? 'Scholarship saved!' : 'Scholarship removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getScholarships, getScholarship, createScholarship, updateScholarship, deleteScholarship, getStats, toggleSave };