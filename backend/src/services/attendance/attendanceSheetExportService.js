import ExcelJS from 'exceljs';
import { buildTectraAttendanceSheetData } from './attendanceSheetService.js';
import { publishAttendanceToGoogleSheet } from './googleSheetsPublisher.js';

export async function writeAttendanceWorkbook(workbook, sheetData) {
    const employeeSheet = workbook.addWorksheet('Employee Details');
    sheetData.employeeDetailsRows.forEach((row, rowIndex) => {
        const excelRow = employeeSheet.getRow(rowIndex + 1);
        row.forEach((value, columnIndex) => {
            excelRow.getCell(columnIndex + 1).value = value;
        });
        if (rowIndex === 0) {
            excelRow.font = { bold: true };
        }
    });
    employeeSheet.columns = [
        { width: 14 },
        { width: 28 },
        { width: 34 },
        { width: 20 },
        { width: 10 }
    ];

    const attendanceSheet = workbook.addWorksheet(sheetData.monthLabel);
    sheetData.attendanceRows.forEach((row, rowIndex) => {
        const excelRow = attendanceSheet.getRow(rowIndex + 1);
        row.forEach((value, columnIndex) => {
            excelRow.getCell(columnIndex + 1).value = value;
        });
        if (rowIndex === 0) {
            excelRow.font = { bold: true };
        }
    });
    attendanceSheet.getColumn(1).width = 14;
    attendanceSheet.getColumn(2).width = 8;
    for (let columnIndex = 3; columnIndex <= sheetData.employees.length + 2; columnIndex += 1) {
        attendanceSheet.getColumn(columnIndex).width = 22;
    }
}

export async function buildAttendanceWorkbookBuffer(prisma, options = {}) {
    const sheetData = await buildTectraAttendanceSheetData(prisma, options);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tectra Attendance';
    workbook.created = new Date();
    await writeAttendanceWorkbook(workbook, sheetData);
    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, sheetData };
}

export async function syncAttendanceToGoogleSheet(prisma, options = {}) {
    const sheetData = await buildTectraAttendanceSheetData(prisma, options);
    const publishResult = await publishAttendanceToGoogleSheet({
        monthLabel: sheetData.monthLabel,
        employeeDetailsRows: sheetData.employeeDetailsRows,
        attendanceRows: sheetData.attendanceRows
    });
    return { sheetData, publishResult };
}
