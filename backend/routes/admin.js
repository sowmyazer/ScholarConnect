// admin.js  →  /api/admin
const express = require('express');
const router = express.Router();
const { getDashboardAnalytics, getUsers, toggleUserStatus, approveScholarship } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly); // All admin routes protected

router.get('/analytics', getDashboardAnalytics);
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.put('/scholarships/:id/approve', approveScholarship);

module.exports = router;