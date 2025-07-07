const Promotion = require('../models/permotion.model');
const path = require('path');

exports.getPromotions = async (req, res) => {
    try {
        const user = req.user;
        console.log('Fetching promotions for user:', JSON.stringify(user, null, 2));
        const promotions = await Promotion.find()
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 })
            .lean();
        console.log('Promotions found:', JSON.stringify(promotions, null, 2));

        const formattedPromotions = promotions.map((promotion) => ({
            id: promotion._id,
            type: promotion.type,
            title: promotion.title,
            description: promotion.description,
            url: promotion.fileUrl,
            uploadedBy: promotion.uploadedBy?.name || 'Admin',
            date: promotion.createdAt.toISOString().split('T')[0],
        }));

        res.status(200).json({ promotions: formattedPromotions });
    } catch (error) {
        console.error('Get promotions error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.uploadPromotion = async (req, res) => {
    try {
        const user = req.user;
        console.log('Uploading promotion for user:', JSON.stringify(user, null, 2));

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized: Only admins can upload promotions' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { type, title, description } = req.body;
        const fileUrl = `/uploads/promotions/${req.file.filename}`;

        const newPromotion = new Promotion({
            type,
            title,
            description,
            fileUrl,
            uploadedBy: user._id,
        });

        await newPromotion.save();
        console.log('New promotion saved:', JSON.stringify(newPromotion, null, 2));

        const formattedPromotion = {
            id: newPromotion._id,
            type: newPromotion.type,
            title: newPromotion.title,
            description: newPromotion.description,
            url: newPromotion.fileUrl,
            uploadedBy: user.name || 'Admin',
            date: newPromotion.createdAt.toISOString().split('T')[0],
        };

        res.status(201).json({ promotion: formattedPromotion });
    } catch (error) {
        console.error('Upload promotion error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};