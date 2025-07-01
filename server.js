const express = require('express');
const connectDB = require('./config/connectDB');
const authRoutes = require('./routes/auth.route');
const cors = require('cors');
require("dotenv").config()
const studyMaterialRoute = require("./routes/studyMaterial.route")
const attendanceRoutes = require("./routes/attendenc.route")
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