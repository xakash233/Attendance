const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const errorHandler = require('./middleware/error');

const app = express();

// Security and other middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(compression());

// Static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const departmentRoutes = require('./routes/department');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const biometricRoutes = require('./routes/biometric');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/biometric', biometricRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Tectra Technologies Enterprise HRMS API v2.0 - OPERATIONAL');
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
