// ============================================================
// Scholarship Routes  →  /api/scholarships
// ============================================================
const express = require('express');
const router = express.Router();
const {
  getScholarships, getScholarship, createScholarship,
  updateScholarship, deleteScholarship, getStats, toggleSave
} = require('../controllers/scholarshipController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

router.get('/stats', getStats);
router.get('/', optionalAuth, getScholarships);
router.get('/:id', optionalAuth, getScholarship);
router.post('/', protect, adminOnly, createScholarship);
router.put('/:id', protect, adminOnly, updateScholarship);
router.delete('/:id', protect, adminOnly, deleteScholarship);
router.post('/:id/save', protect, toggleSave);

module.exports = router;