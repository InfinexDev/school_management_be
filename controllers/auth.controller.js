const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require("../models/user.model");
const { validateEmail, validatePassword, validateRole } = require('../utils/validators');
const generateToken = require('../utils/generateToken');
require('dotenv').config()

// Register User
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, phone, address, class: className, parentEmail } = req.body;

        // Custom validation
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Name is required' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        if (!validateRole(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        if (role === 'student' && (!className || className.trim() === '')) {
            return res.status(400).json({ message: 'Class is required for student role' });
        }
        if (role === 'student' && (!parentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail))) {
            return res.status(400).json({ message: 'Valid parent email is required for student role' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            phone,
            address,
            class: role === 'student' ? className : undefined,
            parentEmail: role === 'student' ? parentEmail : undefined,
            isActive: true,
             isApproved: role === 'student' ? false : true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await user.save();

        // Generate tokens
        const { accessToken, refreshToken } = generateToken(user);

        res.status(201).json({
            message: 'User registered successfully',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Custom validation
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.role === 'student' && !user.isApproved) {
  return res.status(403).json({ message: 'Your account is not yet approved by the admin.' });
}


        // Generate tokens
        const { accessToken, refreshToken } = generateToken(user);

        res.json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Current User Profile
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            address: user.address,
            profilePicture: user.profilePicture,
            parentEmail: user.parentEmail,
            isActive: user.isActive,
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, address, parentEmail } = req.body;
        const userId = req.user._id;

        // Custom validation
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Name is required' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }
        if (req.user.role === 'student' && (!parentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail))) {
            return res.status(400).json({ message: 'Valid parent email is required for student role' });
        }

        // Check if email is already taken by another user
        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                name,
                email,
                phone,
                address,
                parentEmail: req.user.role === 'student' ? parentEmail : undefined,
                updatedAt: new Date(),
            },
            { new: true, runValidators: true },
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                address: updatedUser.address,
                profilePicture: updatedUser.profilePicture,
                parentEmail: updatedUser.parentEmail,
                isActive: updatedUser.isActive,
            },
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.getPendingStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student', isApproved: false }).select('-password');

    res.status(200).json({
      message: 'Pending students fetched successfully',
      total: students.length,
      students: students.map(student => ({
        id: student._id,
        name: student.name,
        email: student.email,
        class: student.class,
        parentEmail: student.parentEmail,
        phone: student.phone,
        address: student.address,
        createdAt: student.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching pending students:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/users/approve/:id
exports.approveStudent = async (req, res) => {
  try {
    const userId = req.params.id;

    const updatedStudent = await User.findByIdAndUpdate(
      userId,
      { isApproved: true },
      { new: true }
    ).select('-password');

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({
      message: 'Student approved successfully',
      student: {
        id: updatedStudent._id,
        name: updatedStudent.name,
        email: updatedStudent.email,
        class: updatedStudent.class,
        parentEmail: updatedStudent.parentEmail,
        phone: updatedStudent.phone,
        address: updatedStudent.address,
        approvedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error approving student:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

