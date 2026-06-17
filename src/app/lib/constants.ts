import { ActivityType } from '../types/activity';
import { LeadImportField } from '../types/import';
import { CheckCircle, XCircle, Voicemail, SkipForward, Mail, Phone, FileText } from 'lucide-react';

export const CARD_WIDTH    = 420;
export const CARD_HEIGHT   = 390;
export const CARD_STRIDE   = 450;
export const CONTAINER_H   = 630;
export const CENTER_Y      = (CONTAINER_H - CARD_HEIGHT) / 2;

export const actionMeta: Record<ActivityType, {
  label: string;
  color: string;
  bgColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  connected: { label: 'Connected',  color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', Icon: CheckCircle },
  lost:      { label: 'Lost',       color: 'text-rose-400',    bgColor: 'bg-rose-500/15',    Icon: XCircle    },
  voicemail: { label: 'Voicemail',  color: 'text-amber-400',   bgColor: 'bg-amber-500/15',   Icon: Voicemail  },
  next:      { label: 'Skipped',    color: 'text-sky-400',     bgColor: 'bg-sky-500/15',     Icon: SkipForward},
  email:     { label: 'Email sent', color: 'text-purple-400',  bgColor: 'bg-purple-500/15',  Icon: Mail       },
  call:      { label: 'Called',     color: 'text-blue-400',    bgColor: 'bg-blue-500/15',    Icon: Phone      },
  notes:     { label: 'Notes saved', color: 'text-yellow-300', bgColor: 'bg-yellow-500/15',  Icon: FileText   },
};

export const IMPORTABLE_FIELDS: { value: LeadImportField; label: string }[] = [
  { value: 'name', label: 'Full Name' },
  { value: 'title', label: 'Title' },
  { value: 'company', label: 'Company' },
  { value: 'industry', label: 'Industry' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'score', label: 'Score' },
  { value: 'status', label: 'Status' },
  { value: 'notes', label: 'Notes' },
  { value: 'source', label: 'Source' },
  { value: 'location', label: 'Location' },
  { value: 'timezone', label: 'Timezone' },
  { value: 'tags', label: 'Tags' },
  { value: 'last_contact', label: 'Last Contact' },
  { value: 'skip', label: 'Do not import' },
];

export const DEFAULT_IMPORT_MAPPING: Record<string, LeadImportField> = {
  name: 'name', fullname: 'name', full_name: 'name',
  first_name: 'skip', lastname: 'skip', last_name: 'skip',
  title: 'title', jobtitle: 'title', job_title: 'title',
  company: 'company', companyname: 'company', company_name: 'company',
  industry: 'industry',
  phone: 'phone', mobile: 'phone', telephone: 'phone',
  email: 'email', score: 'score', status: 'status',
  notes: 'notes', note: 'notes', source: 'source',
  location: 'location', timezone: 'timezone',
  tags: 'tags', tag: 'tags',
  lastcontact: 'last_contact', last_contact: 'last_contact',
};
