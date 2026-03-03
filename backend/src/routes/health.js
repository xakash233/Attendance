const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

router.get('/', async (req, res) => {
    try {
        // Test DB connection
        await prisma.$queryRaw`SELECT 1`;
        
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                database: 'Connected'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            services: {
                database: 'Disconnected',
                error: error.message
            }
        });
    }
});

module.exports = router;
