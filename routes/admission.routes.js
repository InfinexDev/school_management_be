const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admission.controller');

router.post('/', admissionController.submitAdmission);

module.exports = router;