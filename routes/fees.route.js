const express = require('express');
const router = express.Router();
const feeController = require('../controllers/fees.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, feeController.getFees);
router.post('/', authMiddleware, feeController.addFee);
router.post('/pay/:id', authMiddleware, feeController.payFee);
router.get('/payments', authMiddleware, feeController.getPaymentHistory);
router.get('/payments/export', authMiddleware, feeController.exportReport);

module.exports = router;