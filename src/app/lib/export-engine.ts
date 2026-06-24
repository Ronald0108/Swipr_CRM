/**
 * Export Engine
 *
 * Exports leads in multiple formats: CSV, JSON, Excel (.xlsx), vCard (.vcf)
 * Triggers browser download with appropriate filename and MIME type.
 */

import { Lead } from '../data/leads';

export type ExportFormat = 'csv' | 'json' | 'excel' | 'vcard';

export interface ExportOptions {
  fields?: (keyof Lead)[];
  fileName?: string;
}

/** Human-readable labels for export formats */
export const EXPORT_FORMAT_INFO: Record<ExportFormat, {
  label: string;
  extension: string;
  mimeType: string;
  icon: string;
  description: string;
}> = {
  csv: {
    label: 'CSV',
    extension: '.csv',
    mimeType: 'text/csv;charset=utf-8',
    icon: '📊',
    description: 'Comma-separated values. Opens in Excel, Google Sheets, etc.',
  },
  json: {
    label: 'JSON',
    extension: '.json',
    mimeType: 'application/json;charset=utf-8',
    icon: '{ }',
    description: 'Structured data format. Ideal for developers and APIs.',
  },
  excel: {
    label: 'Excel',
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    icon: '📗',
    description: 'Microsoft Excel workbook with styled header row.',
  },
  vcard: {
    label: 'vCard',
    extension: '.vcf',
    mimeType: 'text/vcard;charset=utf-8',
    icon: '👤',
    description: 'Contact card format. Import into phone, Outlook, etc.',
  },
};

/** All available export fields with labels */
export const EXPORTABLE_FIELDS: { key: keyof Lead; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Title' },
  { key: 'company', label: 'Company' },
  { key: 'industry', label: 'Industry' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'score', label: 'Score' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
  { key: 'source', label: 'Source' },
  { key: 'location', label: 'Location' },
  { key: 'timezone', label: 'Timezone' },
  { key: 'tags', label: 'Tags' },
  { key: 'lastContact', label: 'Last Contact' },
  { key: 'callAttempts', label: 'Call Attempts' },
];

const DEFAULT_FIELDS: (keyof Lead)[] = [
  'name', 'title', 'company', 'industry', 'phone', 'email',
  'score', 'status', 'notes', 'source', 'location', 'timezone', 'tags', 'lastContact',
];

/**
 * Escape a CSV field value.
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Get the string representation of a lead field.
 */
function getFieldValue(lead: Lead, field: keyof Lead): string {
  const value = lead[field];
  if (Array.isArray(value)) return value.join('; ');
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Export leads as CSV.
 */
function exportToCsv(leads: Lead[], fields: (keyof Lead)[]): string {
  const headers = fields.map(f => {
    const info = EXPORTABLE_FIELDS.find(e => e.key === f);
    return info ? info.label : f;
  });

  const headerLine = headers.map(h => escapeCsvField(h)).join(',');
  const dataLines = leads.map(lead =>
    fields.map(field => escapeCsvField(getFieldValue(lead, field))).join(',')
  );

  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Export leads as JSON.
 */
function exportToJson(leads: Lead[], fields: (keyof Lead)[]): string {
  const data = leads.map(lead => {
    const record: Record<string, string | number | string[]> = {};
    for (const field of fields) {
      const info = EXPORTABLE_FIELDS.find(e => e.key === field);
      const key = info ? info.label : field;
      record[key] = lead[field] as string | number | string[];
    }
    return record;
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Export leads as Excel (.xlsx).
 */
async function exportToExcel(leads: Lead[], fields: (keyof Lead)[]): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');

  const headers = fields.map(f => {
    const info = EXPORTABLE_FIELDS.find(e => e.key === f);
    return info ? info.label : f;
  });

  const data = leads.map(lead =>
    fields.map(field => getFieldValue(lead, field))
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Style header row with bold
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  }

  // Set column widths
  worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

/**
 * Export leads as vCard (.vcf).
 */
function exportToVcard(leads: Lead[]): string {
  const vcards = leads.map(lead => {
    const parts = lead.name.trim().split(/\s+/);
    const firstName = parts.slice(0, -1).join(' ') || parts[0] || '';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${lead.name}`,
      `N:${lastName};${firstName};;;`,
    ];

    if (lead.company) lines.push(`ORG:${lead.company}`);
    if (lead.title) lines.push(`TITLE:${lead.title}`);
    if (lead.phone) lines.push(`TEL;TYPE=WORK:${lead.phone}`);
    if (lead.email) lines.push(`EMAIL;TYPE=WORK:${lead.email}`);
    if (lead.location) lines.push(`ADR;TYPE=WORK:;;${lead.location};;;;`);
    if (lead.notes) lines.push(`NOTE:${lead.notes.replace(/\n/g, '\\n')}`);

    lines.push('END:VCARD');
    return lines.join('\r\n');
  });

  return vcards.join('\r\n');
}

/**
 * Trigger a browser download for the given content.
 */
function triggerDownload(content: string | ArrayBuffer, fileName: string, mimeType: string) {
  const blob = content instanceof ArrayBuffer
    ? new Blob([content], { type: mimeType })
    : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Main export function — exports leads in the specified format.
 */
export async function exportLeads(
  leads: Lead[],
  format: ExportFormat,
  options: ExportOptions = {}
): Promise<void> {
  const fields = options.fields ?? DEFAULT_FIELDS;
  const baseName = options.fileName ?? `swiprcrm_leads_${new Date().toISOString().split('T')[0]}`;
  const formatInfo = EXPORT_FORMAT_INFO[format];
  const fileName = `${baseName}${formatInfo.extension}`;

  switch (format) {
    case 'csv': {
      const content = exportToCsv(leads, fields);
      triggerDownload(content, fileName, formatInfo.mimeType);
      break;
    }
    case 'json': {
      const content = exportToJson(leads, fields);
      triggerDownload(content, fileName, formatInfo.mimeType);
      break;
    }
    case 'excel': {
      const content = await exportToExcel(leads, fields);
      triggerDownload(content, fileName, formatInfo.mimeType);
      break;
    }
    case 'vcard': {
      const content = exportToVcard(leads);
      triggerDownload(content, fileName, formatInfo.mimeType);
      break;
    }
  }
}
