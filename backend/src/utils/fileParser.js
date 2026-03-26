import csv from 'csv-parser';
import { XMLParser } from 'fast-xml-parser';
import { Readable } from 'stream';
import { parseISO, isValid, format } from 'date-fns';
import ExcelJS from 'exceljs';

// Helper to normalize dates to UTC
export const normalizeTimestamp = (timestamp) => {
    let dateObj;

    // Check if it's already a valid date object
    if (timestamp instanceof Date && !isNaN(timestamp)) {
        dateObj = timestamp;
    }
    // Try passing to date-fns' parseISO for full ISO strings or partials
    else if (typeof timestamp === 'string') {
        dateObj = parseISO(timestamp);
        if (!isValid(dateObj)) {
            // Fallback to native Date parsing
            dateObj = new Date(timestamp);
        }
    } else {
        dateObj = new Date(timestamp);
    }

    if (!isValid(dateObj)) {
        throw new Error(`Invalid timestamp format: ${timestamp}`);
    }

    // Return standard ISO string (which is UTC in Z format)
    return dateObj.toISOString();
};

const parseCsvBuffer = async (buffer) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(buffer.toString('utf-8'));

        stream
            .pipe(csv())
            .on('data', (data) => {
                // Typical eSSL/Biometric mapping: EmployeeCode, LogDate
                const empCode = data['EmployeeCode'] || data['emp_code'] || data['userId'];
                const ts = data['LogDate'] || data['timestamp'] || data['date_time'];

                if (empCode && ts) {
                    try {
                        results.push({
                            employeeCode: String(empCode).trim(),
                            timestamp: normalizeTimestamp(ts)
                        });
                    } catch (e) {
                        // Skip malformed individual rows
                        console.warn(`Skipping malformed CSV row: ${e.message}`);
                    }
                }
            })
            .on('end', () => resolve(results))
            .on('error', (err) => reject(new Error(`CSV parsing error: ${err.message}`)));
    });
};

const parseJsonBuffer = (buffer) => {
    try {
        const jsonString = buffer.toString('utf-8');
        const data = JSON.parse(jsonString);

        // Handle array root or wrapped in 'records'/'data'
        const records = Array.isArray(data) ? data : (data.records || data.data || []);

        return records.map(rec => ({
            employeeCode: String(rec.employeeCode || rec.emp_code || rec.Userid).trim(),
            timestamp: normalizeTimestamp(rec.timestamp || rec.LogDate || rec.time)
        })).filter(r => r.employeeCode && r.timestamp);
    } catch (e) {
        throw new Error(`JSON parsing error: ${e.message}`);
    }
};

const parseXmlBuffer = (buffer) => {
    try {
        const xmlString = buffer.toString('utf-8');
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const result = parser.parse(xmlString);

        // Find the repeatable record elements (e.g., <Record>, <Row>, <Log>)
        let records = [];
        const possibleCollections = [
            result?.Data?.Record, result?.Logs?.Log, result?.Attendance?.Row
        ];

        for (const collection of possibleCollections) {
            if (collection) {
                records = Array.isArray(collection) ? collection : [collection];
                break;
            }
        }

        return records.map(rec => ({
            // Attributes or standard tags mapping
            employeeCode: String(rec.EmployeeCode || rec['@_emp_code'] || rec.UserID || '').trim(),
            timestamp: normalizeTimestamp(rec.LogDate || rec['@_timestamp'] || rec.DateTime)
        })).filter(r => r.employeeCode && r.timestamp);
    } catch (e) {
        throw new Error(`XML parsing error: ${e.message}`);
    }
};

const parseExcelBuffer = async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);
    const results = [];

    // Header validation
    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values.map(v => String(v).toLowerCase());
    
    // We look for flexible mapping
    const colMap = {
        emp: headers.findIndex(h => h.includes('empid') || h.includes('employee') || h.includes('code')),
        date: headers.findIndex(h => h.includes('date') || h.includes('log') || h.includes('time')),
        in: headers.findIndex(h => h.includes('in')),
        out: headers.findIndex(h => h.includes('out'))
    };

    if (colMap.emp === -1 || colMap.date === -1) {
        throw new Error('Invalid Excel structure. Required columns: EmpID (or EmployeeCode) and Date/Timestamp.');
    }

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const empCode = row.getCell(colMap.emp).value;
        const dateVal = row.getCell(colMap.date).value;
        const inVal = colMap.in !== -1 ? row.getCell(colMap.in).value : null;
        const outVal = colMap.out !== -1 ? row.getCell(colMap.out).value : null;

        if (empCode && dateVal) {
            try {
                // If the file has separate IN/OUT columns (standard manually prepared excel)
                if (inVal || outVal) {
                    const baseDate = dateVal instanceof Date ? format(dateVal, 'yyyy-MM-dd') : String(dateVal).split(' ')[0];
                    if (inVal) results.push({ employeeCode: String(empCode).trim(), timestamp: normalizeTimestamp(`${baseDate} ${inVal}`) });
                    if (outVal) results.push({ employeeCode: String(empCode).trim(), timestamp: normalizeTimestamp(`${baseDate} ${outVal}`) });
                } else {
                    // Standard log format
                    results.push({
                        employeeCode: String(empCode).trim(),
                        timestamp: normalizeTimestamp(dateVal)
                    });
                }
            } catch (e) {
                console.warn(`Skipping malformed Excel row ${rowNumber}: ${e.message}`);
            }
        }
    });

    return results;
};

export const parseBiometricFile = async (fileBuffer, mimeType, filename) => {
    const isCsv = mimeType === 'text/csv' || filename.endsWith('.csv');
    const isJson = mimeType === 'application/json' || filename.endsWith('.json');
    const isXml = mimeType === 'text/xml' || mimeType === 'application/xml' || filename.endsWith('.xml');
    const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls') || mimeType?.includes('spreadsheet') || mimeType?.includes('excel');

    if (isCsv) {
        return await parseCsvBuffer(fileBuffer);
    } else if (isJson) {
        return parseJsonBuffer(fileBuffer);
    } else if (isXml) {
        return parseXmlBuffer(fileBuffer);
    } else if (isExcel) {
        return await parseExcelBuffer(fileBuffer);
    } else {
        throw new Error('Unsupported file format. Use CSV, JSON, XML, or XLSX.');
    }
};
