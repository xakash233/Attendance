/**
 * Convert decimal hours (e.g. 8.85) to H.MM display (e.g. 8.51 for 8h 51m).
 * Minutes roll 00–59; after 8.59 comes 9.00 — never 8.60, 8.61, etc.
 */
export function formatHoursAsHmm(decimalHours: unknown): string {
    const val = parseFloat(String(decimalHours ?? ''));
    if (!Number.isFinite(val) || val < 0) return '--';

    const totalMinutes = Math.round(val * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}.${minutes.toString().padStart(2, '0')}`;
}

/**
 * Same as formatHoursAsHmm with optional " HRS" suffix for labels.
 */
export function formatWorkedHoursLabel(decimalHours: unknown): string {
    const formatted = formatHoursAsHmm(decimalHours);
    return formatted === '--' ? formatted : `${formatted} HRS`;
}
