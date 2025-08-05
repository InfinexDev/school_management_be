const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {authMiddleware,isAdmin} = require('../middleware/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.put('/:id', authMiddleware, authController.updateProfile);
router.get('/users/pending-students', authMiddleware, isAdmin, authController.getPendingStudents);
router.put('/users/approve/:id', authMiddleware, isAdmin, authController.approveStudent);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;