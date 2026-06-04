// recommendations.js
const express = require('express');
const router = express.Router();
const { getRecommendations } = require('../controllers/eligibilityController');
const { optionalAuth } = require('../middleware/auth');
router.post('/', optionalAuth, getRecommendations);
module.exports = router;