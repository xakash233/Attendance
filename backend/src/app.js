import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import hpp from 'hpp';
import { fileURLToPath } from 'url';
import { apiLimiter } from './middlewares/rateLimiter.js';
import xss from './middlewares/xss.js';
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


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust Vercel Proxy for correct client IP detection (needed for rate limiting)
app.set('trust proxy', 1);

// Security and other middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.endsWith('.vercel.app') || origin === process.env.FRONTEND_URL) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
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
app.use('/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Tectra Technologies Enterprise HRMS API v2.0 - OPERATIONAL');
});

// Error handling middleware
app.use(errorHandler);

export default app;
