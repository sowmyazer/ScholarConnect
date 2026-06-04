// ============================================================
// Admin Controller
// ============================================================
const User = require('../models/User');
const Scholarship = require('../models/Scholarship');
const { Notification, Contact } = require('../models/Notification');

// @desc    Get admin dashboard analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newUsers, totalScholarships,
      activeScholarships, pendingApproval,
      totalNotifications, unreadContacts
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', createdAt: { $gte: thirtyDaysAgo } }),
      Scholarship.countDocuments(),
      Scholarship.countDocuments({ isApproved: true, deadline: { $gte: now } }),
      Scholarship.countDocuments({ isApproved: false }),
      Notification.countDocuments({ isActive: true }),
      Contact.countDocuments({ status: 'unread' })
    ]);

    // Category breakdown
    const categoryStats = await Scholarship.aggregate([
      { $match: { isApproved: true } },
      { $unwind: '$category' },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Monthly registrations (last 6 months)
    const monthlyRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(now - 6 * 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top scholarships by views
    const topScholarships = await Scholarship.find({ isApproved: true })
      .sort('-views')
      .limit(5)
      .select('name views applicants amount');

    res.json({
      success: true,
      analytics: {
        users: { total: totalUsers, new: newUsers },
        scholarships: { total: totalScholarships, active: activeScholarships, pending: pendingApproval },
        notifications: totalNotifications,
        unreadContacts,
        categoryStats,
        monthlyRegistrations,
        topScholarships
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Get all users
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { role: 'student' };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);
    res.json({ success: true, users, total });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Toggle user active status
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Approve scholarship
const approveScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!scholarship) return res.status(404).json({ success: false, message: 'Scholarship not found.' });

    // Create notification
    await Notification.create({
      title: 'New Scholarship Available',
      message: `${scholarship.name} is now available. Amount: ₹${scholarship.amount.toLocaleString()}`,
      type: 'new_scholarship',
      scholarship: scholarship._id
    });

    res.json({ success: true, message: 'Scholarship approved!', scholarship });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getDashboardAnalytics, getUsers, toggleUserStatus, approveScholarship };