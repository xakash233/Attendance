# 🏢 Tectra Hub | Advanced ERP & Management Console

A high-fidelity, production-grade **Enterprise Resource Planning (ERP)** and **HR Management System** specifically engineered for Tectra Technologies. This ecosystem provides a unified terminal for biometric synchronization, personnel registry, multi-level leave workflows, and real-time administrative oversight.

---

## 🚀 The System Architecture

### 🛠️ Core Technology Stack
- **Frontend Terminal**: [Next.js 14](https://nextjs.org/) (App Router) powered by **Tailwind CSS**.
- **Aesthetics**: Custom-tailored "Strict SaaS" Black & White design system with **Plus Jakarta Sans** and **Inter** typography.
- **Backend Engine**: [Node.js](https://nodejs.org/) & **Express.js** with a high-performance RESTful architecture.
- **Data Persistence**: **PostgreSQL** orchestrated through the **Prisma ORM**.
- **Real-time Synchronization**: [Socket.io](https://socket.io/) for persistent browser-to-server bi-directional communication.
- **Communication Layer**: **Nodemailer** with high-definition, dynamic HTML email templates.

---

## 📊 Operational Workflows (Project Flow)

### 1️⃣ Authentication & Access Control
- **Secure Identification**: A high-end split-screen login interface featuring "Tectra Hub" branding and technical status indicators.
- **Identity Verification**: Multi-factor ready backend with JWT (JSON Web Tokens) handling access and persistent refresh cycles.
- **Access Granted Overlay**: A custom 2-second high-fidelity animation sequence that verifies identity before granting entry to the dashboard.
- **RBAC (Role-Based Access Control)**: Strict hierarchy enforcement:
  - **Super Admin**: Complete system sovereignty (Registry management, final leave decisions, system audits).
  - **Admin**: Strategic oversight and operational management.
  - **HR Admin**: Tactical personnel management (Employee creation, initial leave reviews).
  - **Employee**: Individual record access, leave applications, and task tracking.

### 2️⃣ Personnel Registry & Lifecycle
- **Unified Registry**: A mobile-optimized, high-density table for managing the entire workforce. 
- **Real-time Intelligence**: Instant search across names, emails, and employee codes.
- **Hierarchical Filtering**: Capability to isolate data by **Role Hierarchy** or **Department Unit** with real-time viewport updates.
- **Secure Onboarding**: A multi-step user creation process integrated with OTP (One Time Password) email verification to ensure valid registry entries.
- **Safe Registry Removal**: A custom "Registry Removal Modal" for deletions, enforcing hierarchy rules (e.g., HR can only remove Employees; Super Admins have global authority).

### 3️⃣ Leave Management Workflow (The "Approval Chain")
The system implements a sophisticated, multi-stage approval engine:
1.  **Submission**: Employee applies for leave (Casual, Sick, or Half-Day) via a validation-guarded form.
2.  **Logic Guard**: The backend automatically checks for date overlaps, weekend exclusions, and leave balance sufficiency.
3.  **HR Review**: HR Admins receive a real-time notification (In-app + Email) to perform the first-level review.
4.  **Super Admin Intervention**: Once HR approves, the request moves to the Super Admin for **Final Decision**.
5.  **Notifications**: Upon any decision, the employee receives a **Specialized Email Template** (Casual, Sick, or Half-Day specific) with bold data highlights and official system sign-offs.

### 4️⃣ Biometric & Attendance Pipeline
- **Edge Integration**: Native API support for **eSSL / ZKTeco** biometric devices via the Push Data protocol (`ADMS`).
- **Real-time Processing**: Raw punch-data is instantly transmitted to the backend, matched against user registry nodes, and processed into attendance records.
- **Dashboard Synchronization**: Processed metrics (On-time percentage, total active staff) are updated across all administrative terminals in real-time via Sockets.

---

## 🎨 Premium UX & Performance Features

- **Mobile First Philosophy**: Every module—from the expanded filter panels to the personnel directory table—is perfectly optimized for mobile terminals, ensuring zero horizontal scrolling and full column visibility.
- **Dynamic Header System**: Context-aware breadcrumbs and titles that synchronize with the browser tab title as you traverse the hub.
- **Advanced UI Polish**:
  - **Glassmorphism**: Subtle backdrop blurs on mobile menus and dropdowns.
  - **Micro-animations**: Smooth slide-in filters, pulsing notification indicators, and scale-on-hover profile anchors.
  - **High-End Dropdowns**: Notification and Profile menus optimized to fit perfectly within mobile viewports without bleeding off-screen.

---

## 🛠️ Quick Installation & Deployment

### 🐳 Full Stack Deployment (Docker)
1.  **Clone the Repository**.
2.  **Environment Sync**: Ensure `.env` files are present in both `/backend` and `/frontend`.
3.  **Execute Orchestration**:
    ```bash
    cd backend && docker-compose up -d
    ```
4.  **Database Migration & Seeding**:
    ```bash
    docker exec -it tectra_backend npx prisma db seed
    ```

### 💻 Manual Development Setup
**Backend:**
```bash
cd backend && npm install
npx prisma generate && npx prisma migrate dev && npx prisma db seed
npm start
```
**Frontend:**
```bash
cd frontend && npm install
npm run dev
```

---

## 🔒 Security & Compliance
- **Hierarchy Rules**: The system prevents HR from deleting Admin roles and prevents Admins from deleting Super Admins, both on the Frontend UI and Backend Logic.
- **Encrypted Keys**: Sensitive user data is hashed via **bcryptjs**.
- **Session Safety**: Terminal sessions can be terminated instantly, clearing all local and cookie-based identifiers.

---

## 📟 Biometric Device Setup & Data Mapping

To ensure successful synchronization between your physical ZKTeco/eSSL device and this system, follow these mapping rules:

### 1️⃣ The Critical "Employee Code" Link
The system uses the **Employee Code** field to link a fingerprint scan to a user record.
*   **On Device**: Every user has a numeric ID (e.g., `101`).
*   **In Dashboard**: When adding an employee, set their `Employee Code` to exactly the same value (e.g., `101`).
*   **If missing**: The sync will report a "Failure" because it cannot find which employee the fingerprint belongs to.

### 2️⃣ Device Network Configuration
The backend is currently configured to look for your device at:
*   **IP Address**: `192.168.1.2`
*   **Port**: `4370`
*   **Protocol**: TCP/IP
*   *Note: Ensure your device is on the same local network as the server.*

### 3️⃣ Data Synchronization
*   **Automatic Sync**: The system runs a background task every **30 minutes** to pull new records from the device.
*   **Manual Trigger**: Navigate to `Dashboard > Biometric` and click **"Sync from Device"** to pull records instantly.
*   **Real-time Alerts**: When a sync completes, all active dashboards will receive a live notification via Sockets.

### 4️⃣ Troubleshooting "Failed" Syncs
If you see a "Failed" status in the Biometric Logs:
1.  **Check IP Connectivity**: Ensure you can ping `192.168.1.2` from the server.
2.  **Verify Employee Registry**: Ensure the person who punched has an active account in the portal with the matching Code.
3.  **Check processing Status**: High volumes (3,000+ records) may take a few seconds to process. The system now includes an optimized batch-processing engine to handle large historical logs.

---

## 🏢 Tectra Technologies
**Enterprise Strategic Registry & Tracking Hub**  
*Precision-engineered for modern organizational excellence.*

---

*Ref: README_V2_FINAL*
