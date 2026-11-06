# ⏱️ eSSL Biometric Integration Guide

The full technical documentation and architectural reference for the eSSL / ZKTeco biometric integration has been generated and saved to:

👉 **[docs/ESSL_WORKFLOW_AND_ARCHITECTURE.md](file:///Users/akashsmac/Documents/Attendance/docs/ESSL_WORKFLOW_AND_ARCHITECTURE.md)**

---

## ⚡ Quick Reference

### 1. Dual Integration Modes
- **Mode 1: Direct Cloud WiFi Push (ADMS)** *(Recommended - No laptop required)*:
  - The eSSL machine connects directly to the office WiFi and posts punches over HTTP port 80 to `/iclock/cdata`.
  - Configured in the device under **Menu ➔ Comm. ➔ Cloud Server / ADMS**:
    - **Server Address**: `hrms.tectratechnologies.com` (or IP `157.173.218.57`)
    - **Server Port**: `80` (or `5001`)
    - **Domain Name**: `ON`
- **Mode 2: Local Office LAN Bridge (`node-zklib`)**:
  - Run `node backend/scripts/biometric-local-bridge.mjs` on an office PC connected to the same LAN as the device (`192.168.68.60:4370`).
  - Listens to real-time events over TCP port 4370 and forwards punches to `POST /api/biometric/agent-sync`.

---

### 2. Core Source Code Files
- **ADMS Protocol Controller**: [`backend/src/controllers/adms.js`](file:///Users/akashsmac/Documents/Attendance/backend/src/controllers/adms.js)
- **ADMS Protocol Routes**: [`backend/src/routes/adms.js`](file:///Users/akashsmac/Documents/Attendance/backend/src/routes/adms.js)
- **ADMS Device Service & Clock Sync**: [`backend/src/services/biometric/admsService.js`](file:///Users/akashsmac/Documents/Attendance/backend/src/services/biometric/admsService.js)
- **Biometric Punch Ingestion Service**: [`backend/src/services/biometric/biometricService.js`](file:///Users/akashsmac/Documents/Attendance/backend/src/services/biometric/biometricService.js)
- **Attendance Calculation & Shifts**: [`backend/src/utils/attendanceCalculator.js`](file:///Users/akashsmac/Documents/Attendance/backend/src/utils/attendanceCalculator.js)
- **Punch Burst Collapsing (Dedup)**: [`backend/src/utils/punchDedup.js`](file:///Users/akashsmac/Documents/Attendance/backend/src/utils/punchDedup.js)
- **Local Office Bridge Script**: [`backend/scripts/biometric-local-bridge.mjs`](file:///Users/akashsmac/Documents/Attendance/backend/scripts/biometric-local-bridge.mjs)

---

### 3. Key Operational Commands
- **Test ADMS Handshake**:
  ```bash
  curl -i "http://hrms.tectratechnologies.com/iclock/cdata?SN=JJA1251201425&options=all"
  ```
- **Reset Device Upload Pointer (Re-upload all historical punches)**:
  ```bash
  curl -X POST "http://hrms.tectratechnologies.com/api/biometric/adms/reset-stamp" \
       -H "Content-Type: application/json" \
       -d '{"serialNumber": "JJA1251201425"}'
  ```
- **Watch VPS Live Logs**:
  ```bash
  pm2 logs attendance-backend --lines 50 | grep -E "ADMS|BiometricService"
  ```

