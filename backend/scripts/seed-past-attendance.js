import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { subDays, isWeekend, setHours, setMinutes, differenceInMinutes, format } from 'date-fns';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting full-scale historical attendance seeding (Last 7 Working Days)...');
    
    const users = await prisma.user.findMany({
        where: { role: 'EMPLOYEE' }
    });
    
    if (users.length === 0) {
        console.error('❌ No employees found in registry.');
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let workingDays = [];
    let d = 1;
    while (workingDays.length < 7) {
        const date = subDays(today, d);
        if (!isWeekend(date)) {
            workingDays.push(date);
        }
        d++;
    }

    console.log(`📎 Targeting ${users.length} employees across ${workingDays.length} historical dates.`);

    let recordCount = 0;

    for (const date of workingDays) {
        console.log(`📅 Processing Date: ${format(date, 'yyyy-MM-dd')}...`);
        
        for (const user of users) {
            // Randomized realistic range (IN: 09:30-10:15 | OUT: 18:45-19:30)
            const inHour = 9;
            const inMinute = 30 + Math.floor(Math.random() * 45);
            
            const outHour = 18;
            const outMinute = 45 + Math.floor(Math.random() * 45);

            const checkInTime = setMinutes(setHours(new Date(date), inHour), inMinute);
            const checkOutTime = setMinutes(setHours(new Date(date), outHour), outMinute);

            const workingMinutes = differenceInMinutes(checkOutTime, checkInTime);
            const workingHours = parseFloat((workingMinutes / 60).toFixed(2));

            try {
                // Biometric Logs (Pairing)
                await prisma.biometricAttendance.createMany({
                    data: [
                        {
                            userId: user.id,
                            employeeCode: user.employeeCode,
                            timestamp: checkInTime,
                            verificationMode: 1,
                            deviceLogId: `HIST-IN-${user.id}-${date.getTime()}`
                        },
                        {
                            userId: user.id,
                            employeeCode: user.employeeCode,
                            timestamp: checkOutTime,
                            verificationMode: 1,
                            deviceLogId: `HIST-OUT-${user.id}-${date.getTime()}`
                        }
                    ]
                });

                // Main Attendance Entry
                await prisma.attendance.upsert({
                    where: {
                        userId_date: {
                            userId: user.id,
                            date: date
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
                        date: date,
                        checkIn: checkInTime,
                        checkOut: checkOutTime,
                        status: 'PRESENT',
                        workingHours: workingHours,
                        isManual: false
                    }
                });
                recordCount++;
            } catch (err) {
                // Silently skip if duplicate or error occurs for one specific node
            }
        }
    }

    console.log(`✅ Full historical re-sync completed. ${recordCount} attendance records populated.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
