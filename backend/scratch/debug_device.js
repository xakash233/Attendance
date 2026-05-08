import ZKLib from 'node-zklib';

async function main() {
  const ip = '192.168.68.60';
  const port = 4370;
  let zkInstance = null;
  try {
    console.log(`Connecting to ${ip}:${port}...`);
    zkInstance = new ZKLib(ip, port, 20000, 4000); // 20s timeout
    await zkInstance.createSocket();
    
    console.log('Fetching users...');
    const users = await zkInstance.getUsers();
    console.log('Users on device:', users.data);

    console.log('Fetching attendances...');
    const logs = await zkInstance.getAttendances();
    console.log('Latest 10 logs on device:', logs.data.slice(-10));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (zkInstance && zkInstance.disconnect) {
      try {
        await zkInstance.disconnect();
      } catch (disconnectError) {
        console.error('Disconnect failed:', disconnectError.message);
      }
    }
  }
}

main();
