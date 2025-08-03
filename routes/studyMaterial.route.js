const express = require('express');
const router = express.Router();
const studyMaterialsController = require('../controllers/studyMaterial.controller');
const {authMiddleware} = require('../middleware/auth.middleware');
const upload = require('../config/multerConfig');

router.post('/upload', authMiddleware, upload.single('file'), studyMaterialsController.uploadStudyMaterial);
router.post('/schedule-topic', authMiddleware, studyMaterialsController.scheduleTopic);
router.get('/', authMiddleware, studyMaterialsController.getStudyMaterials);
router.get('/scheduled-topics', authMiddleware, studyMaterialsController.getScheduledTopics);
router.get('/download/:id', authMiddleware, studyMaterialsController.downloadStudyMaterial);

module.exports = router;