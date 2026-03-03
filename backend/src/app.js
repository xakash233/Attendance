const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const hpp = require('hpp');
const { apiLimiter } = require('./middlewares/rateLimiter');
const xss = require('./middlewares/xss');
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

// Sanitize inputs
app.use(xss());
// Prevent HTTP Parameter Pollution
app.use(hpp());

// General API Rate Limiting
app.use('/api/', apiLimiter);

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
const systemRoutes = require('./routes/system');
const auditRoutes = require('./routes/audit');
const healthRoutes = require('./routes/health');
const notificationRoutes = require('./routes/notification');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Tectra Technologies Enterprise HRMS API v2.0 - OPERATIONAL');
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
