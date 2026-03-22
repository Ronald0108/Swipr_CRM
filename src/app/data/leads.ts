export interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  phone: string;
  email: string;
  dealSize: string;
  dealSizeNum: number;
  score: number;
  lastContact: string;
  notes: string;
  status: 'new' | 'connected' | 'voicemail' | 'lost' | 'qualified';
  avatar: string;
  location: string;
  source: string;
  callAttempts: number;
  timezone: string;
  tags: string[];
  companySize: string;
}