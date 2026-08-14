#!/usr/bin/env node
/**
 * Biometric Local Office Bridge Script
 * 
 * Run this script on any desktop computer inside the office LAN (same network as the biometric machine).
 * It connects locally to 192.168.68.60:4370, extracts punches, and sends them securely to your Cloud Backend API.
 * 
 * Usage:
 *   node scripts/biometric-local-bridge.mjs
 * 
 * Environment variables (optional):
 *   BIOMETRIC_DEVICE_IP=192.168.68.60
 *   BIOMETRIC_DEVICE_PORT=4370
 *   CLOUD_API_URL=https://hrms.tectratechnologies.com/api/biometric/agent-sync
 *   SYNC_SECRET=sync-all-records-2026
 *   SYNC_INTERVAL_SECONDS=1
 */

import ZKLib from 'node-zklib';

const DEVICE_IP = process.env.BIOMETRIC_DEVICE_IP || '192.168.68.60';
const DEVICE_PORT = parseInt(process.env.BIOMETRIC_DEVICE_PORT || '4370', 10);
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://hrms.tectratechnologies.com/api/biometric/agent-sync';
const SYNC_SECRET = process.env.SYNC_SECRET || process.env.CRON_SECRET || 'sync-all-records-2026';
const INTERVAL_SECONDS = parseInt(process.env.SYNC_INTERVAL_SECONDS || '1', 10);

const SYNC_BACK_DAYS = parseInt(process.env.SYNC_BACK_DAYS || '30', 10);
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '100', 10);

console.log('==================================================');
console.log('      Tectra Biometric Local Office Bridge        ');
console.log('==================================================');
console.log(`Device Address  : ${DEVICE_IP}:${DEVICE_PORT}`);
console.log(`Cloud Endpoint  : ${CLOUD_API_URL}`);
console.log(`Sync Interval   : Every ${INTERVAL_SECONDS} second(s)`);
console.log(`Sync Back Days  : ${SYNC_BACK_DAYS > 0 ? SYNC_BACK_DAYS + ' days' : 'All history'}`);
console.log(`Chunk Size      : ${CHUNK_SIZE} records per request\n`);

function normalizeEmployeeCode(code) {
    return String(code || '').trim();
}

function sanitizeDisplayName(name, fallbackCode) {
    const normalizedName = String(name || '').trim();
    return normalizedName || `Employee ${fallbackCode}`;
}

async function performBridgeSync() {
    let zkInstance = null;
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Connecting to biometric machine (${DEVICE_IP}:${DEVICE_PORT})...`);
        zkInstance = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);
        await zkInstance.createSocket();

        console.log(`[${new Date().toLocaleTimeString()}] Fetching attendance records and user catalog from machine...`);
        const logs = await zkInstance.getAttendances();
        const users = await zkInstance.getUsers();

        if (!logs || !logs.data || !logs.data.length) {
            console.log(`[${new Date().toLocaleTimeString()}] No records found on device.`);
            return;
        }

        console.log(`[${new Date().toLocaleTimeString()}] Extracted ${logs.data.length} total raw records from device.`);

        const deviceUserMap = new Map(
            ((users && users.data) || []).map((deviceUser) => [
                normalizeEmployeeCode(deviceUser.uid),
                sanitizeDisplayName(deviceUser.name, normalizeEmployeeCode(deviceUser.uid))
            ])
        );

        let records = logs.data.map((log) => {
            let ts = log.recordTime;
            let parsedDate;
            if (ts instanceof Date) {
                parsedDate = ts;
            } else if (typeof ts === 'string') {
                if (ts.endsWith('Z') || ts.includes('+')) {
                    parsedDate = new Date(ts);
                } else {
                    parsedDate = new Date(`${ts.replace(' ', 'T')}+05:30`);
                }
            } else {
                parsedDate = new Date(ts);
            }
            
            const empCode = normalizeEmployeeCode(log.deviceUserId);
            return {
                employeeCode: empCode,
                employeeName: deviceUserMap.get(empCode) || `Employee ${empCode}`,
                timestamp: parsedDate.toISOString(),
                _originalRawTs: ts // For diagnostic
            };
        });

        // Diagnostic Logs (Before Filter)
        console.log(`[Diagnostic] Current Local Time : ${new Date().toString()}`);
        console.log(`[Diagnostic] Current UTC Time   : ${new Date().toISOString()}`);
        console.log(`[Diagnostic] Total Raw Records  : ${records.length}`);
        
        let validRecords = records.filter(r => r.timestamp !== 'Invalid Date');
        if (validRecords.length > 0) {
            validRecords.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            console.log(`[Diagnostic] Min recordTime     : ${validRecords[0].timestamp} (Raw: ${validRecords[0]._originalRawTs})`);
            console.log(`[Diagnostic] Max recordTime     : ${validRecords[validRecords.length - 1].timestamp} (Raw: ${validRecords[validRecords.length - 1]._originalRawTs})`);
        }

        // Filter by date if SYNC_BACK_DAYS > 0
        if (SYNC_BACK_DAYS > 0) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - SYNC_BACK_DAYS);
            console.log(`[Diagnostic] Cutoff Date        : ${cutoffDate.toISOString()}`);
            
            records = records.filter(r => r.timestamp !== 'Invalid Date' && new Date(r.timestamp) >= cutoffDate);
            console.log(`[Diagnostic] Records after filter: ${records.length}`);
            
            if (records.length > 0) {
                console.log(`[Diagnostic] First 3 after filter:`, JSON.stringify(records.slice(0, 3).map(r => ({emp: r.employeeCode, ts: r.timestamp})), null, 2));
                console.log(`[Diagnostic] Last 3 after filter :`, JSON.stringify(records.slice(-3).map(r => ({emp: r.employeeCode, ts: r.timestamp})), null, 2));
            }
        }

        if (records.length === 0) {
            console.log(`[${new Date().toLocaleTimeString()}] No records to sync in target date range.`);
            return;
        }

        // Chunking POST requests
        console.log(`[${new Date().toLocaleTimeString()}] Processing synchronization in chunks of ${CHUNK_SIZE}...`);
        let totalProcessed = 0;
        let totalCreatedUsers = 0;

        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
            const chunk = records.slice(i, i + CHUNK_SIZE);
            const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
            const totalChunks = Math.ceil(records.length / CHUNK_SIZE);

            console.log(`[${new Date().toLocaleTimeString()}] Posting chunk ${chunkNum}/${totalChunks} (${chunk.length} records)...`);

            const response = await fetch(CLOUD_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-sync-secret': SYNC_SECRET
                },
                body: JSON.stringify({ records: chunk })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                totalProcessed += (data.successCount || 0);
                totalCreatedUsers += (data.createdUsersCount || 0);
            } else {
                console.error(`[${new Date().toLocaleTimeString()}] CLOUD SYNC ERROR on Chunk ${chunkNum}:`, data.message || response.statusText);
            }
        }

        console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Cloud sync complete! Processed a total of ${totalProcessed} punches (${totalCreatedUsers} new employees created).`);

    } catch (err) {
        console.error(`[${new Date().toLocaleTimeString()}] LOCAL BRIDGE ERROR:`, err.message || err);
    } finally {
        if (zkInstance && zkInstance.disconnect) {
            try {
                await zkInstance.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
        }
    }
}

let isSyncing = false;

async function runBridgeRunner() {
    if (isSyncing) {
        console.log(`[${new Date().toLocaleTimeString()}] Skip: Previous sync is still running...`);
        return;
    }
    isSyncing = true;
    try {
        await performBridgeSync();
    } finally {
        isSyncing = false;
    }
}

// Execute initial run immediately
await runBridgeRunner();

// Schedule recurring runs if INTERVAL_SECONDS > 0
if (INTERVAL_SECONDS > 0) {
    setInterval(runBridgeRunner, INTERVAL_SECONDS * 1000);
}
