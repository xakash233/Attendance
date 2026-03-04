import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import sendEmail from '../utils/email.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { department: true }
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            const accessToken = generateToken(user.id);
            const refreshToken = generateRefreshToken(user.id);

            // Save refresh token in DB
            await prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });

            // Set cookies
            const isProd = process.env.NODE_ENV === 'production';
            const cookieOptions = {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? 'none' : 'lax',
            };

            res.cookie('token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
            res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token is required' });
    }

    try {
        const savedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken }
        });

        if (!savedToken || savedToken.expiresAt < new Date()) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const accessToken = generateToken(decoded.id);

        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    try {
        if (refreshToken) {
            await prisma.refreshToken.deleteMany({
                where: { token: refreshToken }
            });
        }

        const isProd = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
        };

        res.clearCookie('token', cookieOptions);
        res.clearCookie('refreshToken', cookieOptions);
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) return res.status(404).json({ message: 'Personnel record not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.passwordReset.create({
            data: {
                email: email.toLowerCase(),
                otp,
                expires: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
            }
        });

        await sendEmail({
            email,
            subject: 'Password Recovery Protocol',
            message: `Your account recovery code is: ${otp}. Do not share this key with anyone.`,
            html: `<div style="font-family: sans-serif; padding: 40px; border-radius: 20px; border: 1px solid #eee; max-width: 500px; margin: auto;">
                <h2 style="font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em;">Access Recovery</h2>
                <p>A password reset has been requested for your workforce node.</p>
                <div style="background: #000; color: #fff; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 0.2em;">
                    ${otp}
                </div>
                <p style="font-size: 11px; color: #999;">Expires in 10 minutes. If you did not initiate this, secure your node immediately.</p>
            </div>`
        });

        res.json({ message: 'Recovery code dispatched to registry email' });
    } catch (error) {
        next(error);
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
    const { email, otp, newPassword } = req.body;
    try {
        const reset = await prisma.passwordReset.findFirst({
            where: { email: email.toLowerCase(), otp },
            orderBy: { createdAt: 'desc' }
        });

        if (!reset || new Date() > reset.expires) {
            return res.status(400).json({ message: 'Invalid or expired recovery key' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: { password: hashedPassword }
        });

        await prisma.passwordReset.deleteMany({ where: { email: email.toLowerCase() } });

        res.json({ message: 'Access key updated successfully. Node resynced.' });
    } catch (error) {
        next(error);
    }
};
