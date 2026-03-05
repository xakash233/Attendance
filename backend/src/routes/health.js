import express from 'express';
import prisma from '../config/prisma.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // Test DB connection
        await prisma.$queryRaw`SELECT 1`;

        const healthData = {
            status: 'HEALTHY',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            system: {
                platform: process.platform,
                memory: {
                    total: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
                    heap: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB'
                }
            },
            services: {
                database: 'Connected',
                api: 'Online'
            }
        };

        res.status(200).json(healthData);
    } catch (error) {
        res.status(503).json({
            status: 'DEGRADED',
            timestamp: new Date().toISOString(),
            services: {
                database: 'Disconnected',
                api: 'Online',
                error: error.message
            }
        });
    }
});

export default router;
