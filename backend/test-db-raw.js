import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to:', process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@'));
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('Success:', res.rows[0]);
  } catch (err) {
    console.error('Connection failed:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await client.end();
  }
}

testConnection();
