/**
 * Enhanced CSV/TSV Parser
 *
 * - Auto-detects delimiter (comma, semicolon, tab, pipe)
 * - Handles BOM markers
 * - Handles quoted fields with embedded delimiters and newlines
 * - Handles various line endings (CRLF, LF, CR)
 */

import type { ParsedFileResult } from './index';

/**
 * Detect the most likely delimiter by scoring the first few lines.
 */
function detectDelimiter(text: string): string {
  const candidates = [',', '\t', ';', '|'];
  const sampleLines = text.split(/\r?\n/).slice(0, 10).filter(l => l.trim());

  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delimiter of candidates) {
    // Count delimiter occurrences per line; consistency = high score
    const counts = sampleLines.map(line => {
      let count = 0;
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === delimiter && !inQuotes) count++;
      }
      return count;
    });

    if (counts.length === 0 || counts[0] === 0) continue;

    // Score = consistency across lines × column count
    const headerCount = counts[0];
    const consistentLines = counts.filter(c => c === headerCount).length;
    const score = (consistentLines / counts.length) * headerCount;

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Split a single CSV/TSV line respecting quoted fields.
 */
function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, ''));
}

/**
 * Remove BOM (Byte Order Mark) from the start of text.
 */
function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) return text.slice(1);
  return text;
}

/**
 * Parse CSV or TSV text into a ParsedFileResult.
 */
export function parseCsv(text: string): ParsedFileResult {
  const warnings: string[] = [];
  const cleanText = stripBom(text);
  const delimiter = detectDelimiter(cleanText);

  const format = delimiter === '\t' ? 'tsv' : 'csv';

  // Normalize line endings
  const normalized = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Handle quoted fields that contain newlines
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (const char of normalized) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);

  if (lines.length < 2) {
    warnings.push('File must contain a header row and at least one data row.');
    return { headers: [], rows: [], format, rowCount: 0, warnings };
  }

  const headers = splitLine(lines[0], delimiter);

  // Check for duplicate headers
  const headerSet = new Set<string>();
  const deduplicatedHeaders = headers.map(h => {
    let name = h || 'Column';
    let counter = 1;
    while (headerSet.has(name)) {
      name = `${h}_${counter}`;
      counter++;
    }
    headerSet.add(name);
    return name;
  });

  if (deduplicatedHeaders.length !== headers.length) {
    warnings.push('Duplicate column headers were detected and renamed.');
  }

  const rows = lines.slice(1).map(line => {
    const values = splitLine(line, delimiter);
    return deduplicatedHeaders.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {} as Record<string, string>);
  });

  // Warn about inconsistent column counts
  const expectedCols = deduplicatedHeaders.length;
  const inconsistentRows = lines.slice(1).filter(l => splitLine(l, delimiter).length !== expectedCols).length;
  if (inconsistentRows > 0) {
    warnings.push(`${inconsistentRows} row(s) had a different number of columns than the header.`);
  }

  return {
    headers: deduplicatedHeaders,
    rows,
    format,
    rowCount: rows.length,
    warnings,
  };
}
