import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import sendEmail from '../utils/email.js';
import crypto from 'crypto';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (SUPER_ADMIN, ADMIN)
export const getUsers = async (req, res, next) => {
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
export const initUserCreation = async (req, res, next) => {
    const { name, email, password, role, departmentId, employeeCode } = req.body;

    try {
        // Hierarchy Enforcement: 
        // 1. ADMIN cannot create SUPER_ADMIN
        if (req.user.role === 'ADMIN' && role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Admins cannot create Super Admin accounts.' });
        }
        // 2. HR can only create EMPLOYEE
        if (req.user.role === 'HR' && role !== 'EMPLOYEE') {
            return res.status(403).json({ message: 'HR can only create Employee accounts.' });
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

        // Store pending data in Database instead of Map for durability
        const pendingUser = await prisma.pendingUser.create({
            data: {
                id: pendingId,
                name,
                email: email.toLowerCase(),
                password,
                role: role || 'EMPLOYEE',
                departmentId,
                employeeCode,
                otp,
                expires: new Date(Date.now() + 10 * 60 * 1000)
            }
        });

        // Send OTP to the provided employee email
        try {
            await sendEmail({
                email,
                subject: 'Account Verification OTP',
                message: `Your verification code is: ${otp}. This code is required to finalize your account setup.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #111; background: #fff; border-radius: 12px; border: 1px solid #eee;">
                        <h2 style="color: #000; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em;">Account Setup</h2>
                        <p style="color: #666; font-size: 14px;">A new employee account is being created for your email.</p>
                        <div style="background: #000; color: #fff; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
                            <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.2em;">${otp}</span>
                        </div>
                        <p style="color: #666; font-size: 13px;">Please share this code with the administrator to finalize your account.</p>
                        <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">This security code expires in 10 minutes.</p>
                    </div>
                `
            });
            res.status(200).json({ pendingId, message: 'OTP sent to employee email' });
        } catch (mailError) {
            console.error('CRITICAL: SMTP Connection Failure.');
            console.log('------------------------------------');
            console.log(`VERIFICATION OTP FOR ${email}: ${otp}`);
            console.log('------------------------------------');
            res.status(200).json({
                pendingId,
                message: 'OTP generated. (SMTP Connection failed, check server console for code)',
                mailError: true
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Step 2: Verify OTP & Finalize Creation
// @route   POST /api/users/verify-creation
// @access  Private (SUPER_ADMIN, ADMIN)
export const verifyUserCreation = async (req, res, next) => {
    const { pendingId, otp } = req.body;

    try {
        const pending = await prisma.pendingUser.findUnique({
            where: { id: pendingId }
        });

        if (!pending) {
            return res.status(400).json({ message: 'Session expired or invalid' });
        }

        if (pending.otp !== otp) {
            return res.status(400).json({ message: 'Invalid Verification Code' });
        }

        if (new Date() > pending.expires) {
            await prisma.pendingUser.delete({ where: { id: pendingId } });
            return res.status(400).json({ message: 'OTP expired' });
        }

        const { name, email, password, role, departmentId, employeeCode } = pending;

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
        try {
            await sendEmail({
                email,
                subject: 'Welcome to Tectra Technologies - Your Account Details',
                message: `Welcome ${name}! Your account has been finalized. Email: ${email}, Password: ${password}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #111; background: #fff; border-radius: 12px; border: 1px solid #eee;">
                        <h2 style="color: #000; font-weight: 900; text-transform: uppercase;">Account Activated</h2>
                        <p style="color: #666;">Your account has been successfully created in the HR management system.</p>
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #eee;">
                            <p style="margin: 0 0 10px 0; color: #999; font-size: 11px; font-weight: 800; text-transform: uppercase;">Your Credentials</p>
                            <p style="margin: 5px 0; font-size: 16px;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 5px 0; font-size: 16px;"><strong>Password:</strong> ${password}</p>
                        </div>
                        <p style="color: #666; font-size: 14px;">You can now use these credentials to access the portal.</p>
                        <p style="font-size: 11px; color: #999; margin-top: 30px;">Strict Security Protocol: Change your password after initial access.</p>
                    </div>
                `
            });
        } catch (mailError) {
            console.error('CRITICAL: Final Credential Email Delivery Failure.');
            console.log('------------------------------------');
            console.log(`CREDENTIALS FOR ${name}: ${email} / ${password}`);
            console.log('------------------------------------');
        }

        // Clear pending store from DB
        await prisma.pendingUser.delete({ where: { id: pendingId } });

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
export const getUserProfile = async (req, res, next) => {
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
export const getAnalytics = async (req, res, next) => {
    try {
        const { role, id, departmentId } = req.user;

        if (role === 'SUPER_ADMIN') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const totalEmployees = await prisma.user.count();
            const checkedInToday = await prisma.attendance.count({ where: { date: today } });
            const lateToday = await prisma.attendance.count({ where: { date: today, status: 'LATE' } });
            const presentToday = await prisma.attendance.count({ where: { date: today, status: 'PRESENT' } });

            const stats = {
                totalEmployees,
                totalDepartments: await prisma.department.count(),
                totalLeaveRequests: await prisma.leaveRequest.count({
                    where: {
                        status: { in: ['PENDING_HR', 'HR_APPROVED', 'PENDING_SUPERADMIN'] }
                    }
                }),
                totalTasks: 0,
                onTimeToday: presentToday,
                lateToday: lateToday,
                absentToday: totalEmployees - checkedInToday,
                pendingHrApprovals: await prisma.leaveRequest.count({ where: { status: 'PENDING_HR' } }),
                pendingFinalApprovals: await prisma.leaveRequest.count({
                    where: {
                        status: { in: ['HR_APPROVED', 'PENDING_SUPERADMIN'] }
                    }
                }),
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
