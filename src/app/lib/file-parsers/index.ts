/**
 * Universal File Parser — Master Index
 *
 * Auto-detects file format by extension and MIME type,
 * then delegates to the appropriate parser.
 *
 * Supported formats: CSV, TSV, JSON, Excel (.xlsx/.xls), vCard (.vcf), XML
 */

export type FileFormat = 'csv' | 'tsv' | 'json' | 'excel' | 'vcard' | 'xml';

export interface ParsedFileResult {
  headers: string[];
  rows: Record<string, string>[];
  format: FileFormat;
  rowCount: number;
  warnings: string[];
}

/** Map of supported formats with metadata */
export const FILE_FORMAT_INFO: Record<FileFormat, {
  label: string;
  extensions: string[];
  mimeTypes: string[];
  icon: string;
  color: string;
}> = {
  csv: {
    label: 'CSV',
    extensions: ['.csv'],
    mimeTypes: ['text/csv', 'application/csv'],
    icon: '📊',
    color: '#10B981',
  },
  tsv: {
    label: 'TSV',
    extensions: ['.tsv', '.tab'],
    mimeTypes: ['text/tab-separated-values'],
    icon: '📊',
    color: '#06B6D4',
  },
  json: {
    label: 'JSON',
    extensions: ['.json', '.ndjson', '.jsonl'],
    mimeTypes: ['application/json', 'application/x-ndjson'],
    icon: '{ }',
    color: '#F59E0B',
  },
  excel: {
    label: 'Excel',
    extensions: ['.xlsx', '.xls'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    icon: '📗',
    color: '#22C55E',
  },
  vcard: {
    label: 'vCard',
    extensions: ['.vcf', '.vcard'],
    mimeTypes: ['text/vcard', 'text/x-vcard'],
    icon: '👤',
    color: '#8B5CF6',
  },
  xml: {
    label: 'XML',
    extensions: ['.xml'],
    mimeTypes: ['application/xml', 'text/xml'],
    icon: '📄',
    color: '#EF4444',
  },
};

/** All accepted file extensions for the file input */
export const ACCEPTED_FILE_EXTENSIONS = Object.values(FILE_FORMAT_INFO)
  .flatMap(f => f.extensions)
  .join(',');

/** All accepted MIME types for the file input */
export const ACCEPTED_MIME_TYPES = Object.values(FILE_FORMAT_INFO)
  .flatMap(f => f.mimeTypes)
  .join(',');

/**
 * Detect file format from filename extension and MIME type.
 */
export function detectFileFormat(fileName: string, mimeType?: string): FileFormat | null {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));

  for (const [format, info] of Object.entries(FILE_FORMAT_INFO)) {
    if (info.extensions.includes(ext)) return format as FileFormat;
  }

  if (mimeType) {
    for (const [format, info] of Object.entries(FILE_FORMAT_INFO)) {
      if (info.mimeTypes.includes(mimeType)) return format as FileFormat;
    }
  }

  // Fallback: try to detect from content
  return null;
}

/**
 * Parse a file into a normalized ParsedFileResult.
 * This is the main entry point — auto-detects format and delegates.
 */
export async function parseFile(file: File): Promise<ParsedFileResult> {
  const format = detectFileFormat(file.name, file.type);

  if (!format) {
    return {
      headers: [],
      rows: [],
      format: 'csv',
      rowCount: 0,
      warnings: [`Unsupported file format: "${file.name}". Supported formats: CSV, TSV, JSON, Excel, vCard, XML.`],
    };
  }

  switch (format) {
    case 'csv':
    case 'tsv': {
      const { parseCsv } = await import('./csv-parser');
      const text = await file.text();
      return parseCsv(text);
    }
    case 'json': {
      const { parseJson } = await import('./json-parser');
      const text = await file.text();
      return parseJson(text);
    }
    case 'excel': {
      const { parseExcel } = await import('./excel-parser');
      const buffer = await file.arrayBuffer();
      return parseExcel(buffer);
    }
    case 'vcard': {
      const { parseVcard } = await import('./vcard-parser');
      const text = await file.text();
      return parseVcard(text);
    }
    case 'xml': {
      const { parseXml } = await import('./xml-parser');
      const text = await file.text();
      return parseXml(text);
    }
    default: {
      return {
        headers: [],
        rows: [],
        format: format,
        rowCount: 0,
        warnings: [`Parser not implemented for format: ${format}`],
      };
    }
  }
}
