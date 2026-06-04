// ============================================================
// AI Eligibility & Recommendation Engine
// ============================================================
const Scholarship = require('../models/Scholarship');

// ── Eligibility Scoring Algorithm ─────────────────────────
const calculateEligibilityScore = (student, scholarship) => {
  let score = 0;
  let maxScore = 0;
  const reasons = [];
  const mismatches = [];

  const sc = scholarship.eligibilityCriteria || {};

  // 1. Category match (30 points)
  maxScore += 30;
  if (scholarship.category.includes('General') ||
      scholarship.category.includes(student.category)) {
    score += 30;
    reasons.push(`✅ Category (${student.category}) matches`);
  } else {
    mismatches.push(`❌ Category required: ${scholarship.category.join(', ')}`);
  }

  // 2. Gender match (15 points)
  maxScore += 15;
  if (scholarship.gender === 'All' || scholarship.gender === student.gender) {
    score += 15;
    reasons.push(`✅ Gender eligibility matches`);
  } else {
    mismatches.push(`❌ This scholarship is for ${scholarship.gender} students only`);
  }

  // 3. Class match (20 points)
  maxScore += 20;
  const studentClass = parseInt(student.class);
  if (!isNaN(studentClass) &&
      studentClass >= (sc.minClass || 1) &&
      studentClass <= (sc.maxClass || 12)) {
    score += 20;
    reasons.push(`✅ Class ${student.class} is eligible (${sc.minClass}–${sc.maxClass})`);
  } else {
    mismatches.push(`❌ Eligible class range: ${sc.minClass || 1}–${sc.maxClass || 12}`);
  }

  // 4. Income limit (20 points)
  maxScore += 20;
  const income = parseInt(student.familyIncome);
  const incomeLimit = scholarship.incomeLimit || sc.maxFamilyIncome || 1000000;
  if (!isNaN(income) && income <= incomeLimit) {
    score += 20;
    reasons.push(`✅ Family income ₹${income.toLocaleString()} is within limit`);
  } else {
    mismatches.push(`❌ Income limit: ₹${incomeLimit.toLocaleString()}`);
  }

  // 5. Academic performance (15 points)
  maxScore += 15;
  const pct = parseFloat(student.percentage);
  const minPct = sc.minPercentage || 0;
  if (!isNaN(pct) && pct >= minPct) {
    score += 15;
    reasons.push(`✅ Marks ${pct}% meets minimum ${minPct}%`);
  } else {
    mismatches.push(`❌ Minimum marks required: ${minPct}%`);
  }

  const eligibilityPercent = Math.round((score / maxScore) * 100);
  return { score, maxScore, eligibilityPercent, reasons, mismatches };
};

// @desc    Check eligibility for all scholarships
// @route   POST /api/eligibility/check
const checkEligibility = async (req, res) => {
  try {
    const { classLevel, category, gender, familyIncome, state, percentage } = req.body;

    if (!classLevel || !category || !gender) {
      return res.status(400).json({ success: false, message: 'Please provide class, category, and gender.' });
    }

    const student = {
      class: classLevel,
      category,
      gender,
      familyIncome: familyIncome || 0,
      state: state || 'All India',
      percentage: percentage || 0
    };

    const scholarships = await Scholarship.find({
      isApproved: true,
      deadline: { $gte: new Date() }
    }).lean();

    const results = scholarships.map(s => {
      const analysis = calculateEligibilityScore(student, s);
      return {
        scholarship: {
          _id: s._id,
          name: s.name,
          amount: s.amount,
          deadline: s.deadline,
          category: s.category,
          officialLink: s.officialLink
        },
        ...analysis
      };
    })
    .filter(r => r.eligibilityPercent > 0)
    .sort((a, b) => b.eligibilityPercent - a.eligibilityPercent);

    // Save to user history if logged in
    if (req.user) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          eligibilityHistory: {
            $each: [{ inputs: student, results: results.map(r => r.scholarship._id) }],
            $slice: -10
          }
        }
      });
    }

    res.json({
      success: true,
      student,
      totalChecked: scholarships.length,
      eligible: results.filter(r => r.eligibilityPercent >= 60).length,
      results: results.slice(0, 20) // top 20
    });
  } catch (error) {
    console.error('eligibility error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── AI Recommendation Scoring ──────────────────────────────
const getRecommendationLevel = (score) => {
  if (score >= 80) return { level: 'highly_recommended', label: '⭐ Highly Recommended', color: '#22c55e' };
  if (score >= 60) return { level: 'recommended', label: '👍 Recommended', color: '#3b82f6' };
  if (score >= 40) return { level: 'try_applying', label: '🎯 Try Applying', color: '#f59e0b' };
  return { level: 'low_chance', label: '📝 Low Chance', color: '#ef4444' };
};

// @desc    Get AI Scholarship Recommendations
// @route   POST /api/recommendations
const getRecommendations = async (req, res) => {
  try {
    const { classLevel, category, gender, familyIncome, state, percentage, academicPerformance } = req.body;

    const student = {
      class: classLevel,
      category,
      gender,
      familyIncome: familyIncome || 0,
      state: state || '',
      percentage: percentage || 0
    };

    const scholarships = await Scholarship.find({
      isApproved: true,
      deadline: { $gte: new Date() }
    }).lean();

    const recommendations = scholarships.map(s => {
      const analysis = calculateEligibilityScore(student, s);
      const rec = getRecommendationLevel(analysis.eligibilityPercent);

      // Bonus points for academic performance
      let bonusScore = 0;
      if (academicPerformance === 'excellent' && analysis.eligibilityPercent >= 60) bonusScore = 10;
      else if (academicPerformance === 'good' && analysis.eligibilityPercent >= 50) bonusScore = 5;

      return {
        scholarship: {
          _id: s._id,
          name: s.name,
          amount: s.amount,
          deadline: s.deadline,
          category: s.category,
          description: s.description,
          officialLink: s.officialLink
        },
        eligibilityPercent: Math.min(100, analysis.eligibilityPercent + bonusScore),
        reasons: analysis.reasons,
        recommendation: rec
      };
    })
    .filter(r => r.eligibilityPercent > 30)
    .sort((a, b) => b.eligibilityPercent - a.eligibilityPercent)
    .slice(0, 15);

    const grouped = {
      highly_recommended: recommendations.filter(r => r.recommendation.level === 'highly_recommended'),
      recommended: recommendations.filter(r => r.recommendation.level === 'recommended'),
      try_applying: recommendations.filter(r => r.recommendation.level === 'try_applying')
    };

    res.json({
      success: true,
      totalAnalyzed: scholarships.length,
      recommendations,
      grouped
    });
  } catch (error) {
    console.error('recommendations error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { checkEligibility, getRecommendations };