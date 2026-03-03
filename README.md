# Tectra Technologies Attendance & Management System

A production-grade, fully robust attendance, leave, task, and biometric sync system.

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS (Black & White Theme)
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Security**: JWT (Access & Refresh), Role-based Auth (RBAC)
- **Real-time**: Socket.io

## Features
- Super Admin, Admin, HR, Employee roles.
- Biometric Sync (eSSL integration API).
- Excel Task Import (xlsx parsing).
- Workflow-driven Leave Requests with email/socket notifications.
- Attendance Check-in/out and summary reports.
- Real-time communication via Socket.io.

## Quick Start (with Docker)
1. **Clone the repository**
2. **Setup .env files** in `backend/` and `frontend/` (or use defaults in docker-compose.yml)
3. **Run services**:
   ```bash
   docker-compose up -d
   ```
4. **Seed Database**:
   ```bash
   docker exec -it tectra-backend npx prisma db seed
   ```
5. **Access**:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

## Manual Setup
### Backend
```bash
cd backend
npm install
# Update .env DATABASE_URL
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Default Super Admin Credentials
- **Email**: superadmin@tectra.com
- **Password**: admin123
