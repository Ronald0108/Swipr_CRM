/**
 * Excel Parser (.xlsx / .xls)
 *
 * Uses the SheetJS (xlsx) library to parse Excel workbooks.
 * - Supports multi-sheet workbooks (uses first sheet by default)
 * - Handles merged cells, date/number formatting
 */

import type { ParsedFileResult } from './index';

/**
 * Parse an Excel file (ArrayBuffer) into a ParsedFileResult.
 */
export async function parseExcel(buffer: ArrayBuffer): Promise<ParsedFileResult> {
  const warnings: string[] = [];

  // Dynamic import to avoid bundling xlsx on the server side
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  if (workbook.SheetNames.length === 0) {
    return {
      headers: [],
      rows: [],
      format: 'excel',
      rowCount: 0,
      warnings: ['This Excel file contains no sheets.'],
    };
  }

  if (workbook.SheetNames.length > 1) {
    warnings.push(`Workbook has ${workbook.SheetNames.length} sheets. Using the first sheet: "${workbook.SheetNames[0]}".`);
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON (array of objects)
  const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false, // Get formatted strings instead of raw values
  });

  if (jsonData.length === 0) {
    return {
      headers: [],
      rows: [],
      format: 'excel',
      rowCount: 0,
      warnings: ['The selected sheet is empty or has no data rows.'],
    };
  }

  // Extract headers from the first row's keys
  const headers = Object.keys(jsonData[0]).map(h => String(h));

  // Convert all values to strings
  const rows = jsonData.map(record =>
    headers.reduce((acc, header) => {
      const value = record[header];
      if (value instanceof Date) {
        acc[header] = value.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (value === null || value === undefined) {
        acc[header] = '';
      } else {
        acc[header] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  );

  return {
    headers,
    rows,
    format: 'excel',
    rowCount: rows.length,
    warnings,
  };
}
