const express = require('express');
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, notificationController.getNotifications);
router.post('/', authMiddleware, notificationController.sendNotification);

module.exports = router;