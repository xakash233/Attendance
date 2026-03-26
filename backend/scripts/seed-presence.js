import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { differenceInMinutes } from 'date-fns';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Recording presence for VIJAYKUMAR (09)...');
    
    const user = await prisma.user.findUnique({
        where: { employeeCode: '09' }
    });
    
    if (!user) {
        console.error('❌ User VIJAYKUMAR (09) not found in registry.');
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create Biometric Punches for today
    const checkInTime = new Date(today);
    checkInTime.setHours(9, 30, 0);

    const checkOutTime = new Date(today);
    checkOutTime.setHours(18, 30, 0);

    try {
        // Create biometric logs
        await prisma.biometricAttendance.createMany({
            data: [
                {
                    userId: user.id,
                    employeeCode: user.employeeCode,
                    timestamp: checkInTime,
                    verificationMode: 1,
                    deviceLogId: 'Manual-IN-' + Date.now()
                },
                {
                    userId: user.id,
                    employeeCode: user.employeeCode,
                    timestamp: checkOutTime,
                    verificationMode: 1,
                    deviceLogId: 'Manual-OUT-' + Date.now()
                }
            ]
        });

        // Calculate working hours
        const workingMinutes = differenceInMinutes(checkOutTime, checkInTime);
        const workingHours = parseFloat((workingMinutes / 60).toFixed(2));

        // Create/Update main Attendance record
        await prisma.attendance.upsert({
            where: {
                userId_date: {
                    userId: user.id,
                    date: today
                }
            },
            update: {
                checkIn: checkInTime,
                checkOut: checkOutTime,
                status: 'PRESENT',
                workingHours: workingHours,
                isManual: false
            },
            create: {
                userId: user.id,
                date: today,
                checkIn: checkInTime,
                checkOut: checkOutTime,
                status: 'PRESENT',
                workingHours: workingHours,
                isManual: false
            }
        });

        console.log(`✅ VIJAYKUMAR (09) marked as PRESENT for ${today.toDateString()}.`);
        console.log(`⏱ Hours Worked: ${workingHours}h (09:30 - 18:30)`);
    } catch (error) {
        console.error('❌ Failed to record presence:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
