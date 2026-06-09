import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const ACCESS_DISABLED_MESSAGE = 'Your account access has been disabled. Contact HR or admin.';

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    departmentId: true,
                    employeeCode: true,
                    isAccessEnabled: true
                }
            });

            if (!req.user) {
                console.warn(`[AUTH] User not found during middleware validation for ID: ${decoded.id}`);
                return res.status(401).json({ message: 'Authorization identity no longer exists.' });
            }

            if (req.user.isAccessEnabled === false) {
                return res.status(403).json({ message: ACCESS_DISABLED_MESSAGE });
            }

            next();
        } catch (error) {
            console.error('Auth Middleware Error:', error);
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }
            return res.status(500).json({ message: 'Internal server error during authentication' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};
