/**
 * Build and publish Tectra attendance matrix to Google Sheets.
 *
 * Sheet layout:
 * - Employee Details: ID, Name, Email, Department, Shift
 * - {Month Year}: Date, Day, one column per employee name (WFO/WFH/CL/...)
 *
 * Usage:
 *   node scripts/sync-tectra-attendance-sheet.mjs
 *   node scripts/sync-tectra-attendance-sheet.mjs --month=2026-06
 *   node scripts/sync-tectra-attendance-sheet.mjs --xlsx-only
 *
 * Google sync requires a service account with edit access to the sheet.
 * Share the spreadsheet with the service account email as Editor, then set:
 *   GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 * or GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import {
    buildAttendanceWorkbookBuffer,
    syncAttendanceToGoogleSheet
} from '../src/services/attendance/attendanceSheetExportService.js';
import { TECTRA_ATTENDANCE_SHEET_ID } from '../src/utils/attendanceSheetExport.js';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getArgValue(flag) {
    const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
    return match ? match.split('=').slice(1).join('=') : null;
}

async function main() {
    const month = getArgValue('--month');
    const xlsxOnly = process.argv.includes('--xlsx-only');
    const options = month ? { month } : {};

    const { buffer, sheetData } = await buildAttendanceWorkbookBuffer(prisma, options);
    const exportsDir = path.join(__dirname, '..', 'exports');
    fs.mkdirSync(exportsDir, { recursive: true });

    const fileName = `Tectra_Attendance_${sheetData.payrollMonth}.xlsx`;
    const filePath = path.join(exportsDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    console.log(`Excel written: ${filePath}`);
    console.log(`Employees: ${sheetData.employees.length}`);
    console.log(`Attendance rows: ${sheetData.attendanceRows.length - 1}`);
    console.log(`Columns: Date, Day, ${sheetData.employees.map((user) => user.name).join(', ')}`);

    if (xlsxOnly) {
        console.log(`Import this file into: https://docs.google.com/spreadsheets/d/${TECTRA_ATTENDANCE_SHEET_ID}/edit`);
        return;
    }

    try {
        const { publishResult } = await syncAttendanceToGoogleSheet(prisma, options);
        console.log('Google Sheet updated:', publishResult.spreadsheetUrl);
        console.log(`Tabs: ${publishResult.employeeTab}, ${publishResult.attendanceTab}`);
    } catch (error) {
        console.warn(`Google Sheets sync skipped: ${error.message}`);
        console.log('Generated Excel can be imported manually into the shared spreadsheet.');
    }
}

main()
    .catch((error) => {
        console.error('Failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
