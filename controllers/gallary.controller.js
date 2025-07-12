const Gallery = require('../models/gallary.model');

exports.getGallery = async (req, res) => {
    try {
        const gallery = await Gallery.find()
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const formattedGallery = gallery.map((image) => ({
            id: image._id,
            title: image.title,
            description: image.description,
            fileUrl: image.fileUrl,
            uploadedBy: image.uploadedBy?.name || 'Anonymous',
            date: image.createdAt.toISOString().split('T')[0],
        }));

        res.status(200).json({ gallery: formattedGallery });
    } catch (error) {
        console.error('Get gallery error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.uploadGalleryImage = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = `/Uploads/gallery/${req.file.filename}`;

        const newImage = new Gallery({
            title,
            description,
            fileUrl,
            uploadedBy: req.user ? req.user._id : null, // If user exists, use it; else null
        });

        await newImage.save();

        const formattedImage = {
            id: newImage._id,
            title: newImage.title,
            description: newImage.description,
            fileUrl: newImage.fileUrl,
            uploadedBy: req.user?.name || 'Anonymous',
            date: newImage.createdAt.toISOString().split('T')[0],
        };

        res.status(201).json({ image: formattedImage });
    } catch (error) {
        console.error('Upload gallery image error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
