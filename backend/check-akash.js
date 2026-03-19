import jwt from 'jsonwebtoken';
import 'dotenv/config';

async function run() {
  const token = jwt.sign({ id: 'd827cb65-679d-4d37-bdf7-719939f82210' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const res = await fetch('http://localhost:5001/api/attendance/live', { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await res.json();
  const akash = data.find(u => u.name === 'akash');
  console.log('Akash found?', !!akash);
  if (akash) console.log('Akash details:', akash);
  else console.log('Data length:', data.length);
}
run();
