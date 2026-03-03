const csv = require('csv-parser');
const { XMLParser } = require('fast-xml-parser');
const { Readable } = require('stream');
const { parseISO, isValid } = require('date-fns');

// Helper to normalize dates to UTC
const normalizeTimestamp = (timestamp) => {
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

const parseBiometricFile = async (fileBuffer, mimeType, filename) => {
    const isCsv = mimeType === 'text/csv' || filename.endsWith('.csv');
    const isJson = mimeType === 'application/json' || filename.endsWith('.json');
    const isXml = mimeType === 'text/xml' || mimeType === 'application/xml' || filename.endsWith('.xml');

    if (isCsv) {
        return await parseCsvBuffer(fileBuffer);
    } else if (isJson) {
        return parseJsonBuffer(fileBuffer);
    } else if (isXml) {
        return parseXmlBuffer(fileBuffer);
    } else {
        throw new Error('Unsupported file format. Use CSV, JSON, or XML.');
    }
};

module.exports = {
    parseBiometricFile,
    normalizeTimestamp
};
