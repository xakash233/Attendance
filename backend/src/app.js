import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import hpp from 'hpp';
import { fileURLToPath } from 'url';
import { apiLimiter } from './middleware/rateLimiter.js';
import xss from './middleware/xss.js';
import errorHandler from './middleware/error.js';

// Import Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import departmentRoutes from './routes/department.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leave.js';
import biometricRoutes from './routes/biometric.js';
import systemRoutes from './routes/system.js';
import auditRoutes from './routes/audit.js';
import healthRoutes from './routes/health.js';
import notificationRoutes from './routes/notification.js';
import wfhRoutes from './routes/wfh.js';
import holidayRoutes from './routes/holiday.js';
import admsRoutes from './routes/adms.js';
import pushRoutes from './routes/push.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust Vercel Proxy for correct client IP detection (needed for rate limiting)
app.set('trust proxy', 1);

// ADMS WiFi push must stay BEFORE JSON/urlencoded body parsers.
app.use('/iclock', admsRoutes);
app.use('/api/iclock', admsRoutes);
app.use('/api/biometric/adms', admsRoutes);

// Security and other middleware
app.use(helmet({ contentSecurityPolicy: false }));

const corsAllowedOrigins = new Set([
    'https://hrms.tectratechnologies.com',
    'http://hrms.tectratechnologies.com',
    'http://157.173.218.57',
    'https://157.173.218.57'
]);
if (process.env.FRONTEND_URL) {
    corsAllowedOrigins.add(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, '');
        if (
            cleanOrigin.startsWith('http://localhost') ||
            cleanOrigin.startsWith('http://127.0.0.1') ||
            cleanOrigin.endsWith('.vercel.app') ||
            corsAllowedOrigins.has(cleanOrigin)
        ) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
app.use('/api/wfh', wfhRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/web-push', pushRoutes);
app.use('/api/push', pushRoutes); // alias for older clients
app.use('/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Tectra Technologies Enterprise HRMS API v2.0 - OPERATIONAL');
});

// Error handling middleware
app.use(errorHandler);

export default app;
