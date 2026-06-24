/**
 * vCard Parser (.vcf)
 *
 * Supports vCard 2.1, 3.0, and 4.0 formats.
 * Maps vCard properties to SwiprCRM lead fields.
 */

import type { ParsedFileResult } from './index';

interface VCardProperty {
  name: string;
  value: string;
  params: Record<string, string>;
}

/**
 * Parse a single vCard block into an object of properties.
 */
function parseVCardBlock(block: string): Record<string, string> {
  const lines: string[] = [];
  const rawLines = block.split(/\r?\n/);

  // Handle line folding (continuation lines starting with space or tab)
  for (const line of rawLines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (lines.length > 0) {
        lines[lines.length - 1] += line.slice(1);
      }
    } else {
      lines.push(line);
    }
  }

  const record: Record<string, string> = {};

  for (const line of lines) {
    if (!line.includes(':')) continue;

    const colonIndex = line.indexOf(':');
    const propertyPart = line.slice(0, colonIndex);
    const valuePart = line.slice(colonIndex + 1).trim();

    // Parse property name and parameters
    const parts = propertyPart.split(';');
    const propName = parts[0].toUpperCase();

    // Decode quoted-printable if needed
    const isQP = parts.some(p => p.toUpperCase() === 'ENCODING=QUOTED-PRINTABLE');
    const value = isQP ? decodeQuotedPrintable(valuePart) : valuePart;

    switch (propName) {
      case 'FN':
        record['Name'] = value;
        break;
      case 'N': {
        // N: LastName;FirstName;MiddleName;Prefix;Suffix
        const nameParts = value.split(';');
        if (!record['Name']) {
          const firstName = nameParts[1] || '';
          const lastName = nameParts[0] || '';
          record['Name'] = `${firstName} ${lastName}`.trim();
        }
        break;
      }
      case 'ORG':
        record['Company'] = value.split(';')[0] || '';
        break;
      case 'TITLE':
        record['Title'] = value;
        break;
      case 'TEL':
        if (!record['Phone']) record['Phone'] = value;
        break;
      case 'EMAIL':
        if (!record['Email']) record['Email'] = value;
        break;
      case 'ADR': {
        // ADR: PO Box;Extended;Street;City;State;Zip;Country
        const addrParts = value.split(';');
        const city = addrParts[3] || '';
        const state = addrParts[4] || '';
        const country = addrParts[6] || '';
        record['Location'] = [city, state, country].filter(Boolean).join(', ');
        break;
      }
      case 'NOTE':
        record['Notes'] = value;
        break;
      case 'URL':
        record['Website'] = value;
        break;
      case 'REV':
        record['Last Updated'] = value;
        break;
    }
  }

  return record;
}

/**
 * Decode quoted-printable encoding.
 */
function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Parse a vCard file (.vcf) into a ParsedFileResult.
 */
export function parseVcard(text: string): ParsedFileResult {
  const warnings: string[] = [];

  // Split into individual vCards
  const blocks = text
    .split(/(?=BEGIN:VCARD)/i)
    .filter(block => block.trim().toUpperCase().startsWith('BEGIN:VCARD'));

  if (blocks.length === 0) {
    return {
      headers: [],
      rows: [],
      format: 'vcard',
      rowCount: 0,
      warnings: ['No valid vCard entries found in this file.'],
    };
  }

  // Parse all blocks
  const records = blocks.map(block => parseVCardBlock(block));

  // Collect all unique headers
  const headerSet = new Set<string>();
  records.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
  const headers = Array.from(headerSet);

  // Build rows
  const rows = records.map(record =>
    headers.reduce((acc, header) => {
      acc[header] = record[header] ?? '';
      return acc;
    }, {} as Record<string, string>)
  );

  if (blocks.length > 1) {
    warnings.push(`Parsed ${blocks.length} contacts from vCard file.`);
  }

  return {
    headers,
    rows,
    format: 'vcard',
    rowCount: rows.length,
    warnings,
  };
}
