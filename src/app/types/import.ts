export type LeadImportField =
  | 'name'
  | 'title'
  | 'company'
  | 'industry'
  | 'phone'
  | 'email'
  | 'score'
  | 'status'
  | 'notes'
  | 'source'
  | 'location'
  | 'timezone'
  | 'tags'
  | 'last_contact'
  | 'skip';

export interface CsvPreviewRow {
  [key: string]: string;
}

export type FetchLeadsMode = 'preserve' | 'reset';
export type LeadEditValue = string | string[] | number;
export type CallNotice = { kind: 'success' | 'error'; message: string; durationMs?: number };
