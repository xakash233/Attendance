const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

// Temporary store for OTPs and pending user data
const pendingUsers = new Map();

// @desc    Get all users
// @route   GET /api/users
// @access  Private (SUPER_ADMIN, ADMIN)
exports.getUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            include: { department: true }
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
};

// @desc    Step 1: Initialize User Creation & Send OTP
// @route   POST /api/users/init-creation
// @access  Private (SUPER_ADMIN, ADMIN)
exports.initUserCreation = async (req, res, next) => {
    const { name, email, password, role, departmentId, employeeCode } = req.body;

    try {
        // Hierarchy Enforcement: ADMIN cannot create SUPER_ADMIN
        if (req.user.role === 'ADMIN' && role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Operational Administrators cannot initialize Super Administrative nodes.' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const existingCode = await prisma.user.findUnique({ where: { employeeCode } });
        if (existingCode) {
            return res.status(400).json({ message: 'Employee ID already in use' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const pendingId = crypto.randomUUID();

        // Store pending data
        pendingUsers.set(pendingId, {
            data: { name, email: email.toLowerCase(), password, role: role || 'EMPLOYEE', departmentId, employeeCode },
            otp,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
        });

        // Send OTP to the provided employee email
        await sendEmail({
            email,
            subject: 'Account Verification OTP - Workforce Hub',
            message: `Your verification code is: ${otp}. This code is required to finalize your personnel integration.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #111; background: #fff; border-radius: 12px; border: 1px solid #eee;">
                    <h2 style="color: #000; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em;">Workforce Integration</h2>
                    <p style="color: #666; font-size: 14px;">A new employee node is being initialized for your email.</p>
                    <div style="background: #000; color: #fff; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
                        <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.2em;">${otp}</span>
                    </div>
                    <p style="color: #666; font-size: 13px;">Please share this code with the administrator to finalize your account.</p>
                    <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">This security code expires in 10 minutes.</p>
                </div>
            `
        });

        res.status(200).json({ pendingId, message: 'OTP sent to employee email' });
    } catch (error) {
        next(error);
    }
};

// @desc    Step 2: Verify OTP & Finalize Creation
// @route   POST /api/users/verify-creation
// @access  Private (SUPER_ADMIN, ADMIN)
exports.verifyUserCreation = async (req, res, next) => {
    const { pendingId, otp } = req.body;

    try {
        const pending = pendingUsers.get(pendingId);

        if (!pending) {
            return res.status(400).json({ message: 'Session expired or invalid' });
        }

        if (pending.otp !== otp) {
            return res.status(400).json({ message: 'Invalid Verification Key' });
        }

        if (Date.now() > pending.expires) {
            pendingUsers.delete(pendingId);
            return res.status(400).json({ message: 'OTP expired' });
        }

        const { name, email, password, role, departmentId, employeeCode } = pending.data;

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                departmentId,
                employeeCode
            }
        });

        // Initialize leave balances
        const leaveTypes = await prisma.leaveType.findMany();
        const leaveBalancesData = leaveTypes.map(lt => ({
            userId: user.id,
            leaveTypeId: lt.id,
            balance: lt.daysAllowed
        }));
        await prisma.leaveBalance.createMany({ data: leaveBalancesData });

        // Send Final Credentials to the employee
        await sendEmail({
            email,
            subject: 'Welcome to Tectra Technologies - Your Registry Credentials',
            message: `Welcome ${name}! Your account has been finalized. Email: ${email}, Password: ${password}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #111; background: #fff; border-radius: 12px; border: 1px solid #eee;">
                    <h2 style="color: #000; font-weight: 900; text-transform: uppercase;">Node Activated</h2>
                    <p style="color: #666;">Your personnel node has been successfully integrated into the Enterprise HRMS.</p>
                    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #eee;">
                        <p style="margin: 0 0 10px 0; color: #999; font-size: 11px; font-weight: 800; text-transform: uppercase;">Access Credentials</p>
                        <p style="margin: 5px 0; font-size: 16px;"><strong>Identity:</strong> ${email}</p>
                        <p style="margin: 5px 0; font-size: 16px;"><strong>Passkey:</strong> ${password}</p>
                    </div>
                    <p style="color: #666; font-size: 14px;">You can now use these credentials to access the Workforce Portal.</p>
                    <p style="font-size: 11px; color: #999; margin-top: 30px;">Strict Security Protocol: Change your password after initial access.</p>
                </div>
            `
        });

        // Clear pending store
        pendingUsers.delete(pendingId);

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'USER_CREATED',
                entity: 'User',
                entityId: user.id,
                details: { role, departmentId, employeeCode }
            }
        });

        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                department: true,
                leaveBalances: { include: { leaveType: true } }
            }
        });
        res.json(user);
    } catch (error) {
        next(error);
    }
};

// @desc    Get dashboard analytics
// @route   GET /api/users/analytics
// @access  Private
exports.getAnalytics = async (req, res, next) => {
    try {
        const { role, id, departmentId } = req.user;

        if (role === 'SUPER_ADMIN') {
            const stats = {
                totalEmployees: await prisma.user.count(),
                totalDepartments: await prisma.department.count(),
                pendingHrApprovals: await prisma.leaveRequest.count({ where: { status: 'PENDING_HR' } }),
                pendingFinalApprovals: await prisma.leaveRequest.count({ where: { status: 'HR_APPROVED' } }),
            };
            return res.json(stats);
        } else if (role === 'ADMIN') {
            const stats = {
                deptSummary: await prisma.department.findMany({
                    include: { _count: { select: { employees: true } } }
                }),
                syncHistory: await prisma.attendanceSyncLog.findMany({ take: 5, orderBy: { syncedAt: 'desc' } })
            };
            return res.json(stats);
        } else if (role === 'HR') {
            const stats = {
                pendingLeaves: await prisma.leaveRequest.count({
                    where: {
                        status: 'PENDING_HR',
                        departmentId: departmentId
                    }
                }),
                deptEmployees: await prisma.user.count({ where: { departmentId } })
            };
            return res.json(stats);
        } else {
            const stats = {
                leaveBalance: await prisma.leaveBalance.findMany({ where: { userId: id }, include: { leaveType: true } }),
                recentAttendance: await prisma.attendance.findMany({
                    where: { userId: id },
                    take: 7,
                    orderBy: { date: 'desc' }
                })
            };
            return res.json(stats);
        }
    } catch (error) {
        next(error);
    }
};
