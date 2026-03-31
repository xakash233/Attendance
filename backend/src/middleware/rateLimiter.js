// Rate limiting middleware temporarily DISABLED for development
// To re-enable, un-comment the rateLimit lines below and remove the pass-throughs.

export const loginLimiter = (req, res, next) => next();

export const apiLimiter = (req, res, next) => next();

/* Original Implementation: 
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again after 15 minutes'
    }
});

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests created from this IP, please try again after a minute'
    }
});
*/
