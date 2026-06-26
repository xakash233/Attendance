import fs from 'node:fs';
import { google } from 'googleapis';
import { TECTRA_ATTENDANCE_SHEET_ID } from '../../utils/attendanceSheetExport.js';

function loadServiceAccountCredentials() {
    const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (inlineJson) {
        return JSON.parse(inlineJson);
    }

    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath && fs.existsSync(credentialsPath)) {
        return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    }

    return null;
}

function sanitizeSheetTitle(title) {
    return title.replace(/[\\/?*[\]]/g, '').slice(0, 99);
}

export async function publishAttendanceToGoogleSheet({
    spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || TECTRA_ATTENDANCE_SHEET_ID,
    monthLabel,
    employeeDetailsRows,
    attendanceRows
}) {
    const credentials = loadServiceAccountCredentials();
    if (!credentials) {
        throw new Error(
            'Google Sheets credentials missing. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
        );
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const attendanceTab = sanitizeSheetTitle(monthLabel || 'Attendance');
    const employeeTab = 'Employee Details';

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = new Set((spreadsheet.data.sheets || []).map((sheet) => sheet.properties?.title));

    const requests = [];
    if (!existingTitles.has(employeeTab)) {
        requests.push({ addSheet: { properties: { title: employeeTab } } });
    }
    if (!existingTitles.has(attendanceTab)) {
        requests.push({ addSheet: { properties: { title: attendanceTab } } });
    }

    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests }
        });
    }

    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
            valueInputOption: 'RAW',
            data: [
                {
                    range: `'${employeeTab}'!A1`,
                    values: employeeDetailsRows
                },
                {
                    range: `'${attendanceTab}'!A1`,
                    values: attendanceRows
                }
            ]
        }
    });

    return {
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        employeeTab,
        attendanceTab,
        employeeCount: Math.max(employeeDetailsRows.length - 1, 0),
        attendanceRowCount: Math.max(attendanceRows.length - 1, 0),
        attendanceColumnCount: attendanceRows[0]?.length || 0
    };
}
