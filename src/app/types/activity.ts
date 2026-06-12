export type ActivityType = 'connected' | 'lost' | 'voicemail' | 'next' | 'call' | 'email' | 'notes';

export type ActivityFilter = 'all' | 'statuses' | 'calls' | 'emails';

export interface LeadActivity {
  id: string;
  userId: string;
  leadId: string;
  activityType: ActivityType;
  createdAt: string;
  metadata: Record<string, unknown>;
}
