/**
 * XML Parser
 *
 * Parses generic XML lead/contact data.
 * Auto-detects the record element (e.g., <contact>, <lead>, <record>).
 * Maps child elements to headers.
 *
 * Uses the browser's built-in DOMParser — no external dependency.
 */

import type { ParsedFileResult } from './index';

/** Common element names that indicate a collection of records */
const RECORD_ELEMENT_NAMES = [
  'contact', 'contacts', 'lead', 'leads', 'record', 'records',
  'person', 'people', 'entry', 'entries', 'item', 'items',
  'customer', 'customers', 'prospect', 'prospects', 'row', 'rows',
];

/**
 * Find the best candidate repeating element in an XML document.
 */
function findRecordElements(doc: Document): Element[] {
  // First try: look for known record element names (case-insensitive)
  for (const name of RECORD_ELEMENT_NAMES) {
    const elements = doc.getElementsByTagName(name);
    if (elements.length > 1) return Array.from(elements);
    // Also try singular inside a plural wrapper
    if (elements.length === 1) {
      const children = elements[0].children;
      if (children.length > 1) {
        // Check if children are all the same tag
        const childTag = children[0].tagName;
        const sameTagChildren = Array.from(children).filter(c => c.tagName === childTag);
        if (sameTagChildren.length > 1) return sameTagChildren;
      }
    }
  }

  // Second try: find the most repeated child element at any level
  const root = doc.documentElement;
  let bestElements: Element[] = [];

  function searchLevel(parent: Element) {
    const tagCounts = new Map<string, Element[]>();
    for (const child of Array.from(parent.children)) {
      const tag = child.tagName;
      if (!tagCounts.has(tag)) tagCounts.set(tag, []);
      tagCounts.get(tag)!.push(child);
    }

    for (const [, elements] of tagCounts) {
      if (elements.length > bestElements.length && elements.length > 1) {
        // Make sure these elements have children (are records, not just values)
        if (elements[0].children.length > 0) {
          bestElements = elements;
        }
      }
    }

    // Recurse one level
    for (const child of Array.from(parent.children)) {
      if (child.children.length > 1) {
        searchLevel(child);
      }
    }
  }

  searchLevel(root);
  return bestElements;
}

/**
 * Convert an XML element to a flat key-value record.
 */
function elementToRecord(element: Element): Record<string, string> {
  const record: Record<string, string> = {};

  for (const child of Array.from(element.children)) {
    const key = child.tagName;
    if (child.children.length > 0) {
      // Nested element: flatten with dot notation
      const nested = elementToRecord(child);
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        record[`${key}.${nestedKey}`] = nestedValue;
      }
    } else {
      record[key] = child.textContent?.trim() ?? '';
    }
  }

  // Also collect attributes
  for (const attr of Array.from(element.attributes)) {
    record[`@${attr.name}`] = attr.value;
  }

  return record;
}

/**
 * Parse an XML file into a ParsedFileResult.
 */
export function parseXml(text: string): ParsedFileResult {
  const warnings: string[] = [];

  if (typeof DOMParser === 'undefined') {
    return {
      headers: [],
      rows: [],
      format: 'xml',
      rowCount: 0,
      warnings: ['XML parsing is not available in this environment.'],
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return {
      headers: [],
      rows: [],
      format: 'xml',
      rowCount: 0,
      warnings: [`XML parse error: ${parseError.textContent?.slice(0, 200) ?? 'Unknown error'}`],
    };
  }

  const recordElements = findRecordElements(doc);
  if (recordElements.length === 0) {
    return {
      headers: [],
      rows: [],
      format: 'xml',
      rowCount: 0,
      warnings: ['No repeating record elements found in this XML file.'],
    };
  }

  // Convert elements to records
  const records = recordElements.map(el => elementToRecord(el));

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

  return {
    headers,
    rows,
    format: 'xml',
    rowCount: rows.length,
    warnings,
  };
}
