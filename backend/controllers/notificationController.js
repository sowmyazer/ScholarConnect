// ============================================================
// Notification Controller
// ============================================================
const { Notification } = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .sort('-date')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('scholarship', 'name deadline');

    const total = await Notification.countDocuments(query);
    res.json({ success: true, notifications, total });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createNotification = async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================================
// Contact Controller
// ============================================================
const { Contact } = require('../models/Notification');

const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }
    const contact = await Contact.create({ name, email, subject, message });
    res.status(201).json({ success: true, message: 'Your message has been submitted. We will get back to you soon!', contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort('-createdAt');
    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updateContactStatus = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, contact });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getNotifications, createNotification, deleteNotification,
  submitContact, getContacts, updateContactStatus
};