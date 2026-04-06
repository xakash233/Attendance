import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import sendEmail from '../utils/email.js';
import crypto from 'crypto';

const istDateToUtcMidnight = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00:00.000Z`);

const normalizeUtcDateStr = (d) => {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x.toISOString().split('T')[0];
};

const isHalfDayLeave = (durationType) =>
    ['FIRST_HALF', 'SECOND_HALF', 'HALF_DAY'].includes((durationType || '').toString().toUpperCase());

async function computeHoursSummariesForUsers({ userIds, month }) {
    const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const todayMark = istDateToUtcMidnight(todayIstStr);

    // Current week: Mon..today (Sunday excluded by target logic)
    const day = todayMark.getUTCDay(); // 0 Sun
    const diffToMon = day === 0 ? 6 : day - 1;
    const weekStart = new Date(todayMark);
    weekStart.setUTCDate(todayMark.getUTCDate() - diffToMon);

    // Month range
    const yyyyMm = month || todayIstStr.substring(0, 7);
    const [y, m] = yyyyMm.split('-').map(Number);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const [attendanceRows, holidays, leaves] = await Promise.all([
        prisma.attendance.findMany({
            where: { userId: { in: userIds }, date: { gte: weekStart < monthStart ? weekStart : monthStart, lte: monthEnd } },
            select: { userId: true, date: true, workingHours: true }
        }),
        prisma.holiday.findMany({
            where: { date: { gte: monthStart, lte: monthEnd } },
            select: { date: true }
        }),
        prisma.leaveRequest.findMany({
            where: {
                userId: { in: userIds },
                status: { in: ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'] },
                startDate: { lte: monthEnd },
                endDate: { gte: monthStart }
            },
            select: { userId: true, startDate: true, endDate: true, durationType: true }
        })
    ]);

    const holidaySet = new Set(holidays.map(h => normalizeUtcDateStr(h.date)));

    // Build leave map userId -> dateStr -> targetOverride (0 or 4)
    const leaveTargetByUserDate = new Map();
    for (const l of leaves) {
        const s = new Date(l.startDate); s.setUTCHours(0, 0, 0, 0);
        const e = new Date(l.endDate); e.setUTCHours(0, 0, 0, 0);
        const userKey = l.userId;
        let cur = new Date(s);
        while (cur <= e) {
            const ds = cur.toISOString().split('T')[0];
            // Skip Sundays and holidays for target computation
            const dow = cur.getUTCDay();
            if (dow !== 0 && !holidaySet.has(ds)) {
                const key = `${userKey}::${ds}`;
                leaveTargetByUserDate.set(key, isHalfDayLeave(l.durationType) ? 4 : 0);
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
        }
    }

    const acc = {};
    for (const id of userIds) {
        acc[id] = {
            weekly: { worked: 0, target: 0 },
            monthly: { worked: 0, target: 0 },
            month: yyyyMm
        };
    }

    // Sum worked hours from attendance rows
    for (const r of attendanceRows) {
        const ds = normalizeUtcDateStr(r.date);
        const d = new Date(`${ds}T00:00:00.000Z`);

        // weekly worked: weekStart..todayMark
        if (d >= weekStart && d <= todayMark) {
            acc[r.userId].weekly.worked += r.workingHours || 0;
        }

        // monthly worked: monthStart..monthEnd (full month)
        if (d >= monthStart && d <= monthEnd) {
            acc[r.userId].monthly.worked += r.workingHours || 0;
        }
    }

    // Compute targets day-by-day for each user (month and current week)
    const addTargetForRange = (rangeStart, rangeEnd, bucketKey, includeEnd = true) => {
        let cur = new Date(rangeStart);
        cur.setUTCHours(0, 0, 0, 0);
        const endD = new Date(rangeEnd);
        endD.setUTCHours(0, 0, 0, 0);

        while (includeEnd ? cur <= endD : cur < endD) {
            const ds = cur.toISOString().split('T')[0];
            const dow = cur.getUTCDay();
            const isSunday = dow === 0;
            const isHoliday = holidaySet.has(ds);

            if (!isSunday && !isHoliday) {
                for (const uid of userIds) {
                    const leaveKey = `${uid}::${ds}`;
                    if (leaveTargetByUserDate.has(leaveKey)) {
                        acc[uid][bucketKey].target += leaveTargetByUserDate.get(leaveKey);
                    } else {
                        acc[uid][bucketKey].target += 8;
                    }
                }
            }

            cur.setUTCDate(cur.getUTCDate() + 1);
        }
    };

    addTargetForRange(monthStart, monthEnd, 'monthly', true);
    addTargetForRange(weekStart, todayMark, 'weekly', false);

    // Round
    for (const uid of userIds) {
        acc[uid].weekly.worked = parseFloat(acc[uid].weekly.worked.toFixed(2));
        acc[uid].weekly.target = parseFloat(acc[uid].weekly.target.toFixed(2));
        acc[uid].weekly.delta = parseFloat((acc[uid].weekly.worked - acc[uid].weekly.target).toFixed(2));

        acc[uid].monthly.worked = parseFloat(acc[uid].monthly.worked.toFixed(2));
        acc[uid].monthly.target = parseFloat(acc[uid].monthly.target.toFixed(2));
        acc[uid].monthly.delta = parseFloat((acc[uid].monthly.worked - acc[uid].monthly.target).toFixed(2));
    }

    return acc;
}

// @desc    Get all users
// @route   GET /api/users
// @access  Private (SUPER_ADMIN, ADMIN)
export const getUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                employeeCode: true,
                role: true,
                departmentId: true,
                profileImage: true,
                createdAt: true,
                department: true
            },
            orderBy: { name: 'asc' }
        });
        const includeHours = req.query.includeHours === 'true';
        if (!includeHours) {
            return res.json(users);
        }

        const userIds = users.map(u => u.id);
        const summaries = await computeHoursSummariesForUsers({
            userIds,
            month: typeof req.query.month === 'string' ? req.query.month : undefined
        });

        const enriched = users.map(u => ({
            ...u,
            hours: summaries[u.id]
        }));

        res.json(enriched);
    } catch (error) {
        next(error);
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admins or self)
export const getUser = async (req, res, next) => {
    try {
        const { id: rawId } = req.params;
        const id = rawId?.trim();
        const reqUserId = req.user?.id;
        const reqUserRole = req.user?.role;
        
        console.log(`[USER CTRL] Fetching profile for Param ID: [${id}] | Req User ID: [${reqUserId}] | Role: [${reqUserRole}]`);

        if (!['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role) && req.user.id !== id && id !== 'me') {
            console.warn(`[USER CTRL] Access denied for user ${req.user?.id} requesting ${id}`);
            return res.status(403).json({ message: 'Access denied' });
        }

        // Special Case: "me" identifier resolves to current requester
        const targetId = id === 'me' ? reqUserId : id;

        // First attempt: find by ID (standard UUID)
        let user = await prisma.user.findUnique({
            where: { id: targetId },
            select: {
                id: true, email: true, name: true, employeeCode: true, role: true, 
                departmentId: true, bio: true, phone: true, profileImage: true, shift: true, 
                needsPasswordChange: true, createdAt: true, updatedAt: true, department: true, 
                leaveBalances: { include: { leaveType: true } }
            }
        });

        // Fail-safe: If not found and the ID is numeric or short, try searching by employeeCode
        if (!user && (id.length < 10 || !id.includes('-'))) {
            console.log(`[USER CTRL] UUID lookup failed for [${id}], attempting lookup by employeeCode...`);
            user = await prisma.user.findUnique({
                where: { employeeCode: id },
                select: {
                    id: true, email: true, name: true, employeeCode: true, role: true, 
                    departmentId: true, bio: true, phone: true, profileImage: true, shift: true, 
                    needsPasswordChange: true, createdAt: true, updatedAt: true, department: true, 
                    leaveBalances: { include: { leaveType: true } }
                }
            });
        }

        if (!user) {
            console.error(`[USER CTRL] FATAL: User [${id}] not found in registry (tried ID & EmployeeCode).`);
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('[USER CTRL] getUser error:', error);
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
                shift: req.body.shift || 'B',
                monthlySalary: parseFloat(req.body.monthlySalary || 0),
                otp,
                expires: new Date(Date.now() + 10 * 60 * 1000)
            }
        });

        // Send OTP email (Blocking to ensure delivery attempt)
        console.log(`[USER CTRL] Sending OTP to ${email}`);
        await sendEmail({
            email,
            subject: 'Account Registration Verification (OTP)',
            message: `Your verification code is: ${otp}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #111; background: #fff; border-radius: 12px; border: 1px solid #eee;">
                    <h2 style="color: #000; font-weight: 900; text-transform: uppercase;">Identity Verification</h2>
                    <p style="color: #666;">Use the following security code to confirm the creation of a new node in the registry.</p>
                    <div style="background: #000; color: #fff; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 0.25em;">
                        ${otp}
                    </div>
                    <p style="font-size: 11px; color: #999;">This authentication token expires in 10 minutes.</p>
                </div>
            `
        });
        console.log(`[USER CTRL] OTP successfully dispatched to email.`);

        res.status(200).json({ pendingId, message: 'OTP sent to employee email' });
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

        const { name, email, password, role, departmentId, employeeCode, shift, monthlySalary } = pending;

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                departmentId,
                employeeCode,
                shift,
                monthlySalary
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

        // Send Final Credentials to the employee (Async, non-blocking)
        sendEmail({
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
        }).catch(err => console.error('Final email failed to send asynchronously:', err));

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

        const { password: result, ...safeUser } = user;
        res.status(201).json(safeUser);
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
    try {
        console.log(`[USER CTRL] getUserProfile for ID: ${req.user?.id}`);
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                employeeCode: true,
                role: true,
                departmentId: true,
                bio: true,
                phone: true,
                profileImage: true,
                shift: true,
                needsPasswordChange: true,
                createdAt: true,
                updatedAt: true,
                department: true,
                leaveBalances: { include: { leaveType: true } }
            }
        });
        
        if (!user) {
            console.error(`[USER CTRL] getUserProfile FAILED: User ${req.user.id} not found in repository.`);
            return res.status(404).json({ message: 'Self user profile not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('[USER CTRL] getUserProfile error:', error);
        next(error);
    }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
    try {
        const { name, phone, bio, profileImage } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                name,
                phone,
                bio,
                profileImage
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                bio: true,
                phone: true,
                profileImage: true,
                department: true,
                leaveBalances: { include: { leaveType: true } }
            }
        });
        res.json(user);
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(400).json({ message: 'Current authorization key is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Authorization key successfully updated' });
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

            const [
                totalEmployees,
                totalDepartments,
                totalLeaveRequests,
                checkedInToday,
                lateToday,
                presentToday,
                pendingHrApprovals,
                pendingFinalApprovals
            ] = await Promise.all([
                prisma.user.count(),
                prisma.department.count(),
                prisma.leaveRequest.count({
                    where: { status: { in: ['PENDING_HR', 'HR_APPROVED', 'PENDING_SUPERADMIN'] } }
                }),
                prisma.attendance.count({ where: { date: today } }),
                prisma.attendance.count({ where: { date: today, status: 'LATE' } }),
                prisma.attendance.count({ where: { date: today, status: 'PRESENT' } }),
                prisma.leaveRequest.count({ where: { status: 'PENDING_HR' } }),
                prisma.leaveRequest.count({
                    where: { status: { in: ['HR_APPROVED', 'PENDING_SUPERADMIN'] } }
                })
            ]);

            const stats = {
                totalEmployees,
                totalDepartments,
                totalLeaveRequests,
                totalTasks: 0,
                onTimeToday: presentToday,
                lateToday: lateToday,
                absentToday: totalEmployees - checkedInToday,
                pendingHrApprovals,
                pendingFinalApprovals,
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

// @desc    Global Search (Users + Modules)
// @route   GET /api/users/search
// @access  Private
export const globalSearch = async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 2) {
            return res.json({ users: [], modules: [] });
        }

        const { role } = req.user;
        let users = [];

        // Only let authorized roles search for other real users in the system specifically
        if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(role)) {
            users = await prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } },
                        { employeeCode: { contains: query, mode: 'insensitive' } }
                    ]
                },
                take: 5,
                select: { id: true, name: true, employeeCode: true, profileImage: true, role: true }
            });
        }

        // Hardcode searchable modules
        const availableModules = [
            { name: "Attendance", path: "/dashboard/attendance", icon: "Clock", description: "View and manage records" },
            { name: "Biometric Logs", path: "/dashboard/biometric", icon: "Database", description: "Raw device feeds" },
            { name: "Leaves", path: "/dashboard/leaves", icon: "Calendar", description: "Absence management" },
            { name: "Settings", path: "/dashboard/settings", icon: "Settings", description: "System hub & config" },
            { name: "Staff Management", path: "/dashboard/users", icon: "Users", description: "Personnel registry" },
            { name: "Departments", path: "/dashboard/departments", icon: "Briefcase", description: "Unit organization" },
            { name: "My Profile", path: "/dashboard/profile", icon: "User", description: "Personal Identity info" }
        ];

        const modules = availableModules.filter(m =>
            m.name.toLowerCase().includes(query.toLowerCase()) ||
            m.description.toLowerCase().includes(query.toLowerCase())
        );

        res.json({ users, modules });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (SUPER_ADMIN, HR for employees)
export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const targetUser = await prisma.user.findUnique({ where: { id } });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hierarchy rule:
        // SUPER_ADMIN can delete anyone
        // HR can only delete EMPLOYEE records
        if (req.user.role === 'HR' && targetUser.role !== 'EMPLOYEE') {
            return res.status(403).json({ message: 'HR can only delete Employee accounts.' });
        }
        if (req.user.role === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Admins cannot delete Super Admin accounts.' });
        }

        // Technically we need to decide if we hard delete or soft delete.
        // Assuming cascade delete is set up in prisma or we just hard delete it.
        await prisma.user.delete({
            where: { id }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'USER_DELETED',
                entity: 'User',
                entityId: id,
                details: { role: targetUser.role, employeeCode: targetUser.employeeCode }
            }
        });

        res.json({ message: 'User successfully removed.' });
    } catch (error) {
        next(error);
    }
};
// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (SUPER_ADMIN, HR for employees)
export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, role, departmentId, employeeCode, shift, monthlySalary } = req.body;

        const targetUser = await prisma.user.findUnique({ where: { id } });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hierarchy Enforcement
        if (req.user.role === 'HR' && targetUser.role !== 'EMPLOYEE') {
            return res.status(403).json({ message: 'HR can only edit Employee accounts.' });
        }
        if (req.user.role === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Admins cannot edit Super Admin accounts.' });
        }

        let emailSyncNeeded = false;
        let newEmail = email?.toLowerCase();

        // If email is changing, we initiate verification flow
        if (newEmail && newEmail !== targetUser.email) {
            emailSyncNeeded = true;
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            await prisma.user.update({
                where: { id },
                data: {
                    otp,
                    otpExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
                    emailVerified: false
                }
            });

            await sendEmail({
                email: newEmail,
                subject: 'Security: Confirm Your New Email Address',
                message: `Your verification code is: ${otp}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 25px; background: #fff; border: 1px solid #eee; border-radius: 12px;">
                        <h2 style="color: #101828; font-weight: 900;">Confirm Identity</h2>
                        <p style="color: #667085;">An administrator is updating your account email to this address. Enter the code below to verify.</p>
                        <div style="background: #101828; color: #fff; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; font-size: 36px; font-weight: 900; letter-spacing: 0.3em;">
                            ${otp}
                        </div>
                        <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this message.</p>
                    </div>
                `
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                name,
                role,
                departmentId,
                employeeCode,
                shift,
                monthlySalary: monthlySalary !== undefined ? parseFloat(monthlySalary) : undefined
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                departmentId: true,
                employeeCode: true,
                shift: true,
                monthlySalary: true,
                department: true
            }
        });

        res.json({
            ...updatedUser,
            verificationRequired: emailSyncNeeded,
            message: emailSyncNeeded ? 'Email update initiated. OTP sent to new email.' : 'User updated successfully.'
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Email or Employee Code already in use.' });
        }
        next(error);
    }
};

// @desc    Verify Email Update & Reset Password
// @route   POST /api/users/:id/verify-email
// @access  Private (SUPER_ADMIN)
export const verifyEmailUpdate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { otp, newEmail } = req.body;

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user || user.otp !== otp || new Date() > user.otpExpires) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        // Generate Random Password
        const randomPassword = crypto.randomBytes(4).toString('hex'); // 8 chars
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        await prisma.user.update({
            where: { id },
            data: {
                email: newEmail.toLowerCase(),
                password: hashedPassword,
                emailVerified: true,
                needsPasswordChange: true,
                otp: null,
                otpExpires: null
            }
        });

        // Send credentials to new email
        await sendEmail({
            email: newEmail,
            subject: 'Account Verified - Your Temporary Password',
            message: `Your email has been verified. Temporary password: ${randomPassword}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; background: #fff; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #101828; font-weight: 900;">Verification Successful</h2>
                    <p style="color: #667085;">Your email has been successfully updated. Use the credentials below for your next login.</p>
                    <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #eaecf0;">
                         <p style="margin: 0; font-size: 14px; font-weight: 700; color: #101828;">Temporary Password:</p>
                         <p style="font-size: 24px; font-weight: 900; color: #101828; margin: 5px 0;">${randomPassword}</p>
                    </div>
                    <p style="color: #667085; font-size: 14px;"><strong>Note:</strong> You will be required to change this password on your first login.</p>
                </div>
            `
        });

        res.json({ message: 'Email verified and temporary password sent.' });
    } catch (error) {
        next(error);
    }
};
