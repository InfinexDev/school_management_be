const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middleware/auth.middleware');
const {
    getAttendance,
    markAttendance,
    submitLeaveRequest,
    getLeaveRequests,
    approveLeaveRequest,
} = require('../controllers/attendenc.controller');

router.get('/', authMiddleware, getAttendance);
router.post('/mark', authMiddleware, markAttendance);
router.post('/leave-request', authMiddleware, submitLeaveRequest);
router.get('/leave-requests', authMiddleware, getLeaveRequests);
router.put('/leave-request/:id/approve', authMiddleware, approveLeaveRequest);

module.exports = router;