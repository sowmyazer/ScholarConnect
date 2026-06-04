// notifications.js
const express = require('express');
const router = express.Router();
const { getNotifications, createNotification, deleteNotification } = require('../controllers/notificationController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getNotifications);
router.post('/', protect, adminOnly, createNotification);
router.delete('/:id', protect, adminOnly, deleteNotification);

module.exports = router;