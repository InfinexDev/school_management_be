// const Notification = require('../models/notification.model');
// const User = require('../models/user.model');

// // Get all notifications
// exports.getNotifications = async (req, res) => {
//     try {
//         const user = req.user;
//         let notifications;
//         if (user.role === 'admin' || user.role === 'teacher' || user.role === 'student') {
//             notifications = await Notification.find().populate('sentBy', 'name role').lean();
//         } else if (user.role === 'student') {
//             notifications = await Notification.find({
//                 $or: [
//                     { recipients: user.class },
//                     { recipients: user.name },
//                     { recipients: 'All' },
//                 ],
//             }).populate('sentBy', 'name role').lean();
//         } else {
//             return res.status(403).json({ message: 'Unauthorized access' });
//         }
//         const formattedNotifications = notifications.map((notification) => ({
//             id: notification._id,
//             type: notification.type,
//             subject: notification.subject,
//             message: notification.message,
//             recipients: notification.recipients,
//             sentBy: notification.sentBy?.name || 'Unknown',
//             date: notification.date.toISOString().split('T')[0],
//         }));
//         res.status(200).json({ notifications: formattedNotifications });
//     } catch (error) {
//         console.error('Get notifications error:', error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };

// // Send notification (Admin/Teacher only)
// exports.sendNotification = async (req, res) => {
//     try {
//         const { type, subject, message, recipients } = req.body;
//         const user = req.user;

//         if (user.role !== 'admin' && user.role !== 'teacher') {
//             return res.status(403).json({ message: 'Only admin or teacher can send notifications' });
//         }
//         if (!type || !subject || !message || !recipients) {
//             return res.status(400).json({ message: 'All fields are required' });
//         }

//         const notification = new Notification({
//             type,
//             subject,
//             message,
//             recipients,
//             sentBy: user._id,
//             date: new Date(),
//         });

//         await notification.save();

//         res.status(201).json({
//             message: 'Notification sent successfully',
//             notification: {
//                 id: notification._id,
//                 type: notification.type,
//                 subject: notification.subject,
//                 message: notification.message,
//                 recipients: notification.recipients,
//                 sentBy: user.name,
//                 date: notification.date.toISOString().split('T')[0],
//             },
//         });
//     } catch (error) {
//         console.error('Send notification error:', error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };


const nodemailer = require('nodemailer');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
require("dotenv").config()

const sendEmail = async ({ to, subject, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"School System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: `<p>${text}</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const user = req.user;
    let notifications;

    if (user.role === 'admin' || user.role === 'teacher') {
      // Admins and teachers see all notifications
      notifications = await Notification.find().populate('sentBy', 'name role').lean();
    } else if (user.role === 'student') {
      // Students see notifications for their class or "All Students"
      notifications = await Notification.find({
        $or: [
          { recipients: user.class },
          { recipients: 'All Students' },
          { recipients: 'All Parents' }, // Parents get notifications too
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
      return res.status(403).json({ message: 'Only admins and teachers can send notifications' });
    }
    if (!type || !subject || !message || !recipients) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate recipients
    const validRecipients = [
      'All Students',
      'All Parents',
      'All Teachers',
      'Class 1',
      'Class 2',
      'Class 3',
      'Class 4',
      'Class 5',
      'Class 6',
      'Class 7',
      'Class 8',
      'Class 9',
      'Class 10',
      'Class 11',
      'Class 12',
    ];
    if (!validRecipients.includes(recipients)) {
      return res.status(400).json({ message: 'Invalid recipient group' });
    }

    // Fetch recipient emails
    let recipientEmails = [];
    if (recipients === 'All Students') {
      const students = await User.find({ role: 'student' }).select('email');
      recipientEmails = students.map((student) => student.email).filter(Boolean);
    } else if (recipients === 'All Parents') {
      const students = await User.find({ role: 'student' }).select('parentEmail');
      recipientEmails = students.map((student) => student.parentEmail).filter(Boolean);
    } else if (recipients === 'All Teachers') {
      const teachers = await User.find({ role: 'teacher' }).select('email');
      recipientEmails = teachers.map((teacher) => teacher.email).filter(Boolean);
    } else if (recipients.startsWith('Class ')) {
      const className = recipients;
      const students = await User.find({ role: 'student', class: className }).select('email');
      recipientEmails = students.map((student) => student.email).filter(Boolean);
    }

    if (recipientEmails.length === 0) {
      return res.status(404).json({ message: 'No valid recipients found for this group' });
    }

    // Send emails if type is Email
    if (type === 'Email') {
      await Promise.all(
        recipientEmails.map((email) =>
          sendEmail({
            to: email,
            subject,
            text: `Dear Recipient,\n\n${message}\n\nRegards,\nSchool System`,
          })
        )
      );
    } else {
      // Placeholder for SMS/WhatsApp (not implemented)
      console.log(`Sending ${type} notification to ${recipients}: ${subject} - ${message}`);
      // Add Twilio/WhatsApp API logic here if needed
    }

    // Save notification to database
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