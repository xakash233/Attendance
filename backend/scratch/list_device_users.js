import ZKLib from 'node-zklib';

async function main() {
  const ip = '192.168.68.60';
  const port = 4370;
  let zkInstance = null;
  try {
    console.log(`Connecting to ${ip}:${port}...`);
    zkInstance = new ZKLib(ip, port, 10000, 4000);
    await zkInstance.createSocket();
    
    console.log('Fetching users from device...');
    const users = await zkInstance.getUsers();
    if (users && users.data) {
      console.log('Users on device:', users.data);
    } else {
      console.log('No users found on device.');
    }
  } catch (error) {
    console.error('Error connecting to device:', error.message);
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
