const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const promotionController = require('../controllers/permotion.controller');
const {authMiddleware} = require('../middleware/auth.middleware');

router.get('/', authMiddleware, promotionController.getPromotions);
router.post('/', authMiddleware, upload.single('file'), promotionController.uploadPromotion);

module.exports = router;