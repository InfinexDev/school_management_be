const Notification = require('../models/notification.model');
const User = require('../models/user.model');

// Get all notifications
exports.getNotifications = async (req, res) => {
    try {
        const user = req.user;
        let notifications;
        if (user.role === 'admin' || user.role === 'teacher' || user.role === 'student') {
            notifications = await Notification.find().populate('sentBy', 'name role').lean();
        } else if (user.role === 'student') {
            notifications = await Notification.find({
                $or: [
                    { recipients: user.class },
                    { recipients: user.name },
                    { recipients: 'All' },
                ],
            }).populate('sentBy', 'name role').lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const formattedNotifications = notifications.map((notification) => ({
            id: notification._id,
            type: notification.type,
            subject: notification.subject,
            message: notification.message,
            recipients: notification.recipients,
            sentBy: notification.sentBy?.name || 'Unknown',
            date: notification.date.toISOString().split('T')[0],
        }));
        res.status(200).json({ notifications: formattedNotifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Send notification (Admin/Teacher only)
exports.sendNotification = async (req, res) => {
    try {
        const { type, subject, message, recipients } = req.body;
        const user = req.user;

        if (user.role !== 'admin' && user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only admin or teacher can send notifications' });
        }
        if (!type || !subject || !message || !recipients) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const notification = new Notification({
            type,
            subject,
            message,
            recipients,
            sentBy: user._id,
            date: new Date(),
        });

        await notification.save();

        res.status(201).json({
            message: 'Notification sent successfully',
            notification: {
                id: notification._id,
                type: notification.type,
                subject: notification.subject,
                message: notification.message,
                recipients: notification.recipients,
                sentBy: user.name,
                date: notification.date.toISOString().split('T')[0],
            },
        });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};