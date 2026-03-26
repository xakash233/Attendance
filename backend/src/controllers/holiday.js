import prisma from '../config/prisma.js';
import auditService from '../services/audit/auditService.js';

export const getHolidays = async (req, res, next) => {
    try {
        const { year } = req.query;
        let whereClause = {};
        if (year) {
            const y = parseInt(year);
            whereClause = {
                date: {
                    gte: new Date(Date.UTC(y, 0, 1)),
                    lt: new Date(Date.UTC(y + 1, 0, 1))
                }
            };
        }
        
        const holidays = await prisma.holiday.findMany({
            where: whereClause,
            orderBy: { date: 'asc' }
        });
        
        res.json(holidays);
    } catch (error) {
        next(error);
    }
};

export const createHoliday = async (req, res, next) => {
    try {
        const { date, name, type } = req.body;
        
        // Parse the input date strictly as UTC so YYYY-MM-DD creates exactly midnight UTC
        const parsedDate = new Date(`${date}T00:00:00.000Z`);

        const holiday = await prisma.holiday.create({
            data: {
                date: parsedDate,
                name,
                type: type || 'GOVERNMENT'
            }
        });

        await auditService.logAction({
            userId: req.user.id,
            action: 'CREATE_HOLIDAY',
            entity: 'Holiday',
            entityId: holiday.id,
            details: { name, date },
            ipAddress: req.ip
        });

        res.status(201).json(holiday);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'A holiday on this date already exists.' });
        }
        next(error);
    }
};

export const deleteHoliday = async (req, res, next) => {
    try {
        const { id } = req.params;
        const holiday = await prisma.holiday.findUnique({ where: { id } });
        if (!holiday) return res.status(404).json({ message: 'Holiday not found' });

        await prisma.holiday.delete({ where: { id } });

        await auditService.logAction({
            userId: req.user.id,
            action: 'DELETE_HOLIDAY',
            entity: 'Holiday',
            entityId: id,
            details: { name: holiday.name, date: holiday.date },
            ipAddress: req.ip
        });

        res.json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        next(error);
    }
};
