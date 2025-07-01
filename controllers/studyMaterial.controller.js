const mongoose = require('mongoose');
const StudyMaterial = require('../models/studyMaterial');
const ScheduledTopic = require('../models/scheduledTopic.model');
const { sendNotification } = require('../utils/notificationService');
const { validateClass, validateSubject, validateMaterialType, validateTitle } = require('../utils/validators');
const path = require('path');
const multer = require('multer');
const fs = require("fs");

// Upload Study Material (Teacher-only)
exports.uploadStudyMaterial = async (req, res) => {
    try {
        const { class: className, subject, type, title } = req.body;
        const user = req.user;

        // Validate user
        if (!user || !user._id) {
            return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
        }
        if (user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can upload study materials' });
        }

        // Custom validation
        if (!validateClass(className)) {
            return res.status(400).json({ message: 'Valid class is required' });
        }
        if (!validateSubject(subject)) {
            return res.status(400).json({ message: 'Valid subject is required' });
        }
        if (!validateMaterialType(type)) {
            return res.status(400).json({ message: 'Valid material type (PDF, Video, Assignment) is required' });
        }
        if (!validateTitle(title)) {
            return res.status(400).json({ message: 'Valid title is required' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'A PDF or MP4 file is required' });
        }

        const url = `/Uploads/${req.file.filename}`;

        const studyMaterial = new StudyMaterial({
            class: className,
            subject,
            type,
            title,
            url,
            uploadedBy: user._id,
            date: new Date()
        });

        await studyMaterial.save();

        // Notify students
        await sendNotification({
            class: className,
            subject,
            message: `New ${type} material "${title}" uploaded for ${className} - ${subject}`,
            type: 'material_upload'
        });

        res.status(201).json({
            message: 'Study material uploaded successfully',
            material: {
                id: studyMaterial._id,
                class: studyMaterial.class,
                subject: studyMaterial.subject,
                type: studyMaterial.type,
                title: studyMaterial.title,
                url: studyMaterial.url,
                uploadedBy: user.name,
                date: studyMaterial.date.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error('Upload study material error:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({ message: error.message });
        }
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size exceeds 50MB limit' });
            }
            return res.status(400).json({ message: error.message || 'File upload error' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Schedule Daily Topic (Teacher-only)
exports.scheduleTopic = async (req, res) => {
    try {
        const { class: className, subject, topic, date } = req.body;
        const user = req.user;

        // Validate user role
        if (user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can schedule topics' });
        }

        // Custom validation
        if (!validateClass(className)) {
            return res.status(400).json({ message: 'Valid class is required' });
        }
        if (!validateSubject(subject)) {
            return res.status(400).json({ message: 'Valid subject is required' });
        }
        if (!topic || topic.trim() === '') {
            return res.status(400).json({ message: 'Valid topic is required' });
        }
        if (!date || isNaN(new Date(date))) {
            return res.status(400).json({ message: 'Valid date is required' });
        }

        const scheduledTopic = new ScheduledTopic({
            class: className,
            subject,
            topic,
            date: new Date(date),
            scheduledBy: user._id
        });

        await scheduledTopic.save();

        // Notify students via WhatsApp/SMS/Email
        await sendNotification({
            class: className,
            subject,
            message: `New topic "${topic}" scheduled for ${className} - ${subject} on ${date}`,
            type: 'topic_schedule'
        });

        res.status(201).json({
            message: 'Topic scheduled successfully',
            topic: {
                id: scheduledTopic._id,
                class: scheduledTopic.class,
                subject: scheduledTopic.subject,
                topic: scheduledTopic.topic,
                date: scheduledTopic.date.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error('Schedule topic error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Fetch Study Materials
exports.getStudyMaterials = async (req, res) => {
    try {
        const materials = await StudyMaterial.find()
            .populate('uploadedBy', 'name')
            .sort({ date: -1 });

        res.json({
            materials: materials.map(material => ({
                id: material._id,
                class: material.class,
                subject: material.subject,
                type: material.type,
                title: material.title,
                url: material.url,
                uploadedBy: material.uploadedBy.name,
                date: material.date.toISOString().split('T')[0]
            }))
        });
    } catch (error) {
        console.error('Fetch study materials error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Fetch Scheduled Topics
exports.getScheduledTopics = async (req, res) => {
    try {
        const topics = await ScheduledTopic.find()
            .sort({ date: -1 });

        res.json({
            topics: topics.map(topic => ({
                id: topic._id,
                class: topic.class,
                subject: topic.subject,
                topic: topic.topic,
                date: topic.date.toISOString().split('T')[0]
            }))
        });
    } catch (error) {
        console.error('Fetch scheduled topics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.downloadStudyMaterial = async (req, res) => {
    try {
        const material = await StudyMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        const filePath = path.join(__dirname, '..', material.url);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }
        res.download(filePath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};