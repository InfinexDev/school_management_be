const express = require('express');
const connectDB = require('./config/connectDB');
const authRoutes = require('./routes/auth.route');
const cors = require('cors');
require("dotenv").config()
const studyMaterialRoute = require("./routes/studyMaterial.route")
const attendanceRoutes = require("./routes/attendenc.route")
const notificationRoutes = require("./routes/notification.route")
const feeRoutes = require("./routes/fees.route")
const userRoutes = require("./routes/user.route")
const reportRoutes = require("./routes/report.route")
const promotionRoute = require("./routes/promotion.route")
const admissionRoute = require("./routes/admission.routes")
const gallaryRoute = require("./routes/gallary.route")
const path = require('path');

// const helmet = require('helmet');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// app.use(helmet());
app.use(cors({
    origin: '*',
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/study-materials', studyMaterialRoute);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api', feeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/promotions', promotionRoute)
app.use('/api/admissions', admissionRoute);
app.use('/api/gallery', gallaryRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});