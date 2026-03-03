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
   cd backend && docker-compose up -d
   ```
4. **Seed Database**:
   ```bash
   docker exec -it tectra_backend npx prisma db seed
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

## Project Status & Roadmap

### Completed as of Now
- **Infrastructure**: Dockerized setup for Frontend, Backend, and PostgreSQL. Moved `docker-compose.yml` to backend for localized control.
- **Authentication**: JWT-based Access & Refresh token system with Role-Based Access Control (RBAC).
- **Core Database Schema**: Comprehensive Prisma schema covering Users, Departments, Leaves, Attendance, and Biometric Sync.
- **Department Hubs**: Refined UI for creating and managing department information, including manager assignments and member metrics.
- **Dashboard**: Core layout with sidebar and role-specific navigation.
- **Responsive UI**: "Strict Black & White Corporate" theme implemented with mobile responsiveness fixes.

### Remaining Tasks
- **Biometric Integration**: Finalize the API sync with eSSL devices (handling JSON/XML parsing).
- **Excel Task Module**: Implement the `.xlsx` parser for bulk task assignments and imports.
- **Workflow Automation**: Complete the multi-level leave approval logic (HR -> Super Admin).
- **Socket.io Integration**: Wire up real-time notifications for leave approvals and attendance check-ins.
- **Reports & Analytics**: Develop exportable attendance summaries (PDF/Excel) and dashboard data visualizations.
- **Audit Logging**: Fully implement tracking for sensitive actions (salary changes, manual attendance edits).

### Known Edge Cases to Address
- **Offline Sync**: Handling biometric data when the local device or server has intermittent connectivity.
- **Timezone Conflicts**: Ensuring attendance timestamps are consistent across server and client timezones (UTC vs. Local).
- **Concurrent Leave Requests**: Preventing duplicate leave applications for overlapping dates.
- **Grace Period Logic**: Handling "Late" status when an employee checks in exactly at the grace period cutoff.
- **Manual Overrides**: Managing the conflict-resolution logic when a manual attendance entry contradicts a biometric sync.
- **Token Expiry during active session**: Seamlessly refreshing tokens without interruptive UI flashes or data loss.

---

## Default Super Admin Credentials
- **Email**: superadmin@tectra.com
- **Password**: admin123
