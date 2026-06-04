// users.js  →  /api/users (student self-service)
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get saved scholarships
router.get('/saved', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedScholarships', 'name amount deadline category description');
    res.json({ success: true, scholarships: user.savedScholarships });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Get applied scholarships
router.get('/applied', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('appliedScholarships.scholarship', 'name amount deadline');
    res.json({ success: true, applied: user.appliedScholarships });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Mark scholarship as applied
router.post('/apply/:scholarshipId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const already = user.appliedScholarships.find(a =>
      a.scholarship.toString() === req.params.scholarshipId
    );
    if (already) return res.status(409).json({ success: false, message: 'Already marked as applied.' });

    user.appliedScholarships.push({ scholarship: req.params.scholarshipId });
    await user.save();

    // Increment applicant count
    await require('../models/Scholarship').findByIdAndUpdate(
      req.params.scholarshipId, { $inc: { applicants: 1 } }
    );

    res.json({ success: true, message: 'Marked as applied!' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;