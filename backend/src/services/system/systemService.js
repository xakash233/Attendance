const prisma = require('../../config/prisma');

class SystemService {
    async getSettings() {
        let settings = await prisma.systemSettings.findFirst();

        // Ensure defaults exist if table is empty
        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: {
                    workStartTime: '09:00',
                    workEndTime: '18:00',
                    halfDayCutoffTime: '13:30',
                    gracePeriod: 15,
                    wfhMonthlyLimit: 4,
                    wfhConsecutiveLimit: 2
                }
            });
        }
        return settings;
    }

    async updateSettings(data) {
        const settings = await this.getSettings();

        return await prisma.systemSettings.update({
            where: { id: settings.id },
            data
        });
    }
}

module.exports = new SystemService();
