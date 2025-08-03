const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const {authMiddleware} = require('../middleware/auth.middleware');

router.get('/', authMiddleware, reportController.getReports);
router.post('/', authMiddleware, reportController.generateReport);
router.get('/export/:id', authMiddleware, reportController.exportReport);

module.exports = router;