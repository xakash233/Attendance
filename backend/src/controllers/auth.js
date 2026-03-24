import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import sendEmail from '../utils/email.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { department: true }
        });

        if (!user) {
            return res.status(401).json({ message: 'User account not found' });
        }

        if (await bcrypt.compare(password, user.password)) {
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

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                profileImage: user.profileImage,
                employeeCode: user.employeeCode,
                needsPasswordChange: user.needsPasswordChange,
                accessToken,
                refreshToken
            });
        } else {
            res.status(401).json({ message: 'Incorrect Password provided' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
    const { refreshToken } = req.body;

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

        res.json({ accessToken });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
    const { refreshToken } = req.body;
    try {
        await prisma.refreshToken.deleteMany({
            where: { token: refreshToken }
        });
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
    const email = req.body.email?.trim().toLowerCase();
    try {
        if (!email) return res.status(400).json({ message: 'Email identifier is required' });

        const user = await prisma.user.findUnique({ where: { email } });
        
        // Security Protocol: Always return 200 to prevent user enumeration 
        // and avoid confusing 404 errors for legacy registered personnel.
        if (!user) return res.json({ message: 'Recovery protocol initiated. If your identity matches the registry, check your secure inbox.' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.passwordReset.create({
            data: {
                email: email.toLowerCase(),
                otp,
                expires: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
            }
        });

        // Dispatch the recovery protocol
        await sendEmail({
            email,
            subject: 'Password Recovery Protocol',
            message: `Your account recovery code is: ${otp}. Do not share this key with anyone.`,
            html: `<div style="font-family: Arial, sans-serif; padding: 40px; border-radius: 20px; border: 1px solid #eee; max-width: 500px; margin: auto; background: white;">
                <h2 style="font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; color: #101828;">Access Recovery</h2>
                <p style="color: #667085;">A password reset has been requested for your workforce node. Enter the key below in the portal.</p>
                <div style="background: #101828; color: #fff; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 0.2em;">
                    ${otp}
                </div>
                <p style="font-size: 11px; color: #999;">Expires in 10 minutes. If you did not initiate this, secure your node immediately.</p>
            </div>`
        });
        
        res.json({ message: 'Recovery code dispatched to Registered Email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to dispatch recovery code. Please contact hub admin.' });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
    const { email, otp } = req.body;
    try {
        const reset = await prisma.passwordReset.findFirst({
            where: { email: email.toLowerCase(), otp },
            orderBy: { createdAt: 'desc' }
        });

        if (!reset || new Date() > reset.expires) {
            return res.status(400).json({ message: 'Invalid or expired recovery key' });
        }

        // Generate strong system password
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
        let generatedPassword = '';
        for (let i = 0; i < 12; i++) {
            generatedPassword += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        // Ensure complex requirements are visibly met
        generatedPassword = `Tc#${generatedPassword}9!`;

        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: { password: hashedPassword }
        });

        await prisma.passwordReset.deleteMany({ where: { email: email.toLowerCase() } });

        await sendEmail({
            email,
            subject: 'New System Cipher Dispatched',
            message: `Your new system cipher is: ${generatedPassword}. Please log in and change it immediately.`,
            html: `<div style="font-family: Arial, sans-serif; padding: 40px; border-radius: 20px; border: 1px solid #eee; max-width: 500px; margin: auto; background: white;">
                <h2 style="font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; color: #101828;">Access Restored</h2>
                <p style="color: #667085;">Your authorization node has been reset with a new complex cipher.</p>
                <div style="background: #101828; color: #fff; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: 900; letter-spacing: 0.1em; word-break: break-all;">
                    ${generatedPassword}
                </div>
                <p style="font-size: 11px; color: #999; font-weight: bold;">Log in with this key and update your security settings via your profile.</p>
            </div>`
        });

        res.json({ message: 'New complex cipher generated and dispatched to your email.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to dispatch new cipher. Please contact hub admin.' });
    }
};

// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
            return res.status(401).json({ message: 'Current password provided is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                password: hashedPassword,
                needsPasswordChange: false 
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'PASSWORD_CHANGE',
                entity: 'USER',
                entityId: req.user.id,
                details: { timestamp: new Date() }
            }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};
