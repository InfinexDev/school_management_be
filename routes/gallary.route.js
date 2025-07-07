const express = require('express');
const router = express.Router();
const upload = require('../utils/multerGallary');
const galleryController = require('../controllers/gallary.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, galleryController.getGallery);
router.post('/', authMiddleware, upload.single('file'), galleryController.uploadGalleryImage);

module.exports = router;