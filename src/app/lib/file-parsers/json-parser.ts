/**
 * JSON Parser
 *
 * Handles multiple JSON shapes:
 * - Array of objects: [{name: "...", email: "..."}, ...]
 * - Nested objects: {contacts: [{...}]} — auto-detects the array key
 * - NDJSON (newline-delimited JSON)
 * - Flattens nested objects into dot-notation headers
 */

import type { ParsedFileResult } from './index';

/**
 * Flatten a nested object into dot-notation keys.
 * e.g., { address: { city: "NYC" } } → { "address.city": "NYC" }
 */
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[fullKey] = '';
    } else if (Array.isArray(value)) {
      result[fullKey] = value.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ');
    } else if (typeof value === 'object') {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }

  return result;
}

/**
 * Find the best candidate array in a nested JSON object.
 * Heuristic: find the largest array of objects.
 */
function findRecordArray(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      return data as Record<string, unknown>[];
    }
    return null;
  }

  if (typeof data === 'object' && data !== null) {
    let bestArray: Record<string, unknown>[] | null = null;
    let bestLength = 0;

    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value.length > bestLength) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          bestArray = value as Record<string, unknown>[];
          bestLength = value.length;
        }
      }
    }

    // Recurse one level deeper if nothing found at top level
    if (!bestArray) {
      for (const value of Object.values(data)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const nested = findRecordArray(value);
          if (nested && nested.length > bestLength) {
            bestArray = nested;
            bestLength = nested.length;
          }
        }
      }
    }

    return bestArray;
  }

  return null;
}

/**
 * Try parsing as NDJSON (newline-delimited JSON).
 */
function tryParseNdjson(text: string): Record<string, unknown>[] | null {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  try {
    const records: Record<string, unknown>[] = [];
    for (const line of lines) {
      const parsed = JSON.parse(line);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
      records.push(parsed as Record<string, unknown>);
    }
    return records;
  } catch {
    return null;
  }
}

/**
 * Parse a JSON file into a ParsedFileResult.
 */
export function parseJson(text: string): ParsedFileResult {
  const warnings: string[] = [];

  // Try NDJSON first
  const ndjsonRecords = tryParseNdjson(text);
  if (ndjsonRecords) {
    return processRecords(ndjsonRecords, warnings);
  }

  // Try standard JSON
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return {
      headers: [],
      rows: [],
      format: 'json',
      rowCount: 0,
      warnings: [`Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`],
    };
  }

  const records = findRecordArray(data);
  if (!records || records.length === 0) {
    return {
      headers: [],
      rows: [],
      format: 'json',
      rowCount: 0,
      warnings: ['No array of records found in this JSON file. Expected an array of objects or an object containing one.'],
    };
  }

  if (!Array.isArray(data)) {
    warnings.push('Records were auto-detected from a nested JSON structure.');
  }

  return processRecords(records, warnings);
}

function processRecords(records: Record<string, unknown>[], warnings: string[]): ParsedFileResult {
  // Flatten all records and collect all unique headers
  const flattenedRecords = records.map(r => flattenObject(r));
  const headerSet = new Set<string>();
  flattenedRecords.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
  const headers = Array.from(headerSet);

  // Build rows with all headers
  const rows = flattenedRecords.map(record =>
    headers.reduce((acc, header) => {
      acc[header] = record[header] ?? '';
      return acc;
    }, {} as Record<string, string>)
  );

  return {
    headers,
    rows,
    format: 'json',
    rowCount: rows.length,
    warnings,
  };
}
