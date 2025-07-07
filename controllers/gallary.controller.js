const Gallery = require('../models/gallary.model');

exports.getGallery = async (req, res) => {
    try {
        const user = req.user;
        console.log('Fetching gallery for user:', JSON.stringify(user, null, 2));
        const gallery = await Gallery.find()
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 })
            .lean();
        console.log('Gallery images found:', JSON.stringify(gallery, null, 2));

        const formattedGallery = gallery.map((image) => ({
            id: image._id,
            title: image.title,
            description: image.description,
            fileUrl: image.fileUrl,
            uploadedBy: image.uploadedBy?.name || 'Admin',
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
        const user = req.user;
        console.log('Uploading gallery image for user:', JSON.stringify(user, null, 2));

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized: Only admins can upload gallery images' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { title, description } = req.body;
        const fileUrl = `/Uploads/gallery/${req.file.filename}`;

        const newImage = new Gallery({
            title,
            description,
            fileUrl,
            uploadedBy: user._id,
        });

        await newImage.save();
        console.log('New gallery image saved:', JSON.stringify(newImage, null, 2));

        const formattedImage = {
            id: newImage._id,
            title: newImage.title,
            description: newImage.description,
            fileUrl: newImage.fileUrl,
            uploadedBy: user.name || 'Admin',
            date: newImage.createdAt.toISOString().split('T')[0],
        };

        res.status(201).json({ image: formattedImage });
    } catch (error) {
        console.error('Upload gallery image error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};