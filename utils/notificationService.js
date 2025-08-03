const nodemailer = require('nodemailer');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
require('dotenv').config();

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send email
const sendEmail = async ({ to, subject, text }) => {
  try {
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

// Main notification service function
const sendNotification = async ({ userId, class: className, section, subject, message, type, recipients }) => {
  try {
    let recipientEmails = [];
    
    // Determine recipients based on input
    if (userId) {
      // Specific user notification (e.g., absence or leave approval)
      const user = await User.findById(userId).select('email parentEmail');
      if (!user) {
        throw new Error('User not found');
      }
      if (user.email) recipientEmails.push(user.email);
      if (user.parentEmail && type === 'absence_notification') {
        recipientEmails.push(user.parentEmail);
      }
    } else if (recipients) {
      // Group-based recipients (from notification.controller.js)
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
        const students = await User.find({ role: 'student', class: recipients }).select('email');
        recipientEmails = students.map((student) => student.email).filter(Boolean);
      }
    } else if (className && section) {
      // Class and section-specific notifications (from studyMaterial.controller.js)
      const students = await User.find({ role: 'student', class: className, section }).select('email');
      recipientEmails = students.map((student) => student.email).filter(Boolean);
    } else if (className) {
      // Class-specific notifications (e.g., leave requests)
      const students = await User.find({ role: 'student', class: className }).select('email');
      recipientEmails = students.map((student) => student.email).filter(Boolean);
    }

    if (recipientEmails.length === 0) {
      console.log('No valid recipients found for notification');
      return;
    }

    // Send emails based on notification type
    if (type === 'Email' || type === 'absence_notification' || type === 'leave_request' || type === 'leave_approval' || type === 'material_upload' || type === 'topic_schedule') {
      await Promise.all(
        recipientEmails.map((email) =>
          sendEmail({
            to: email,
            subject: `School Notification: ${subject || type.replace(/_/g, ' ').toUpperCase()}`,
            text: `Dear Recipient,\n\n${message}\n\nRegards,\nSchool System`,
          })
        )
      );
    } else {
      // Placeholder for SMS/WhatsApp notifications
      console.log(`Sending ${type} notification to ${recipientEmails.length} recipients: ${message}`);
      // Add Twilio/WhatsApp API logic here if needed
    }

    // Save notification to database (except for absence notifications, as they are handled in attendence.controller.js)
    if (type !== 'absence_notification') {
      const notification = new Notification({
        type,
        subject: subject || type.replace(/_/g, ' ').toUpperCase(),
        message,
        recipients: recipients || (className ? `${className}${section ? ` - Section ${section}` : ''}` : 'Individual'),
        sentBy: userId || null, // Use null if no specific userId provided
        date: new Date(),
      });
      await notification.save();
    }

    console.log(`Notification sent successfully: ${type} - ${message}`);
  } catch (error) {
    console.error('Notification service error:', error);
    throw new Error('Failed to send notification');
  }
};

module.exports = { sendNotification };