import ZKLib from 'node-zklib';

async function checkDeviceUsers() {
    const ip = '192.168.68.60';
    const port = 4370;
    let zkInstance = null;
    try {
        console.log(`Connecting to ${ip}:${port}...`);
        zkInstance = new ZKLib(ip, port, 10000, 4000);
        await zkInstance.createSocket();
        
        const users = await zkInstance.getUsers();
        console.log('Users on device:', JSON.stringify(users.data, null, 2));

        const attendances = await zkInstance.getAttendances();
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayLogs = attendances.data.filter(log => new Date(log.recordTime) >= today);
        console.log('Today Logs on device:', JSON.stringify(todayLogs, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (zkInstance && zkInstance.disconnect) {
            await zkInstance.disconnect();
        }
    }
}

checkDeviceUsers();
