import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({ where: { name: 'akash' } });
  if (!user) return console.log('no user');
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  
  const res = await fetch('http://localhost:5001/api/attendance/live', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const body = await res.text();
  console.log('STATUS:', res.status);
  console.log('BODY:', body);
}
run();
