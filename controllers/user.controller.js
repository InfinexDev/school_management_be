const User = require('../models/user.model');

// Get all students
exports.getStudents = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can access student list' });
    }
    const students = await User.find({ role: 'student' }).select('name rollNo class').lean();
    res.status(200).json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};