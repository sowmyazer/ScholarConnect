// eligibility.js
const express = require('express');
const router = express.Router();
const { checkEligibility } = require('../controllers/eligibilityController');
const { optionalAuth } = require('../middleware/auth');
router.post('/check', optionalAuth, checkEligibility);
module.exports = router;