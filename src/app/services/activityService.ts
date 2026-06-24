import { supabase } from '../../lib/supabase';
import type { ActivityFilter, ActivityType, LeadActivity } from '../types/activity';

interface LeadActivityRow {
  id: string;
  user_id: string;
  lead_id: string;
  activity_type: ActivityType;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function mapRowToLeadActivity(row: LeadActivityRow): LeadActivity {
  return {
    id: row.id,
    userId: row.user_id,
    leadId: row.lead_id,
    activityType: row.activity_type,
    createdAt: row.created_at,
    metadata: row.metadata ?? {},
  };
}

function applyFilter(query: any, filter: ActivityFilter) {
  if (filter === 'statuses') return query.in('activity_type', ['connected', 'lost', 'voicemail', 'next']);
  if (filter === 'calls') return query.eq('activity_type', 'call');
  if (filter === 'emails') return query.eq('activity_type', 'email');
  return query;
}

export async function fetchRecentActivities(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data as LeadActivityRow[] | null) ?? []).map(mapRowToLeadActivity);
}

export async function fetchLeadActivities(userId: string, leadId: string, filter: ActivityFilter = 'all', limit = 100) {
  let query = supabase
    .from('lead_activities')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId);

  query = applyFilter(query, filter);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

  if (error) throw error;

  return ((data as LeadActivityRow[] | null) ?? []).map(mapRowToLeadActivity);
}

export async function insertLeadActivity(userId: string, leadId: string, activityType: ActivityType, metadata: Record<string, unknown> = {}) {
  const { data, error } = await supabase
    .from('lead_activities')
    .insert({
      user_id: userId,
      lead_id: leadId,
      activity_type: activityType,
      metadata,
    })
    .select('*')
    .single();

  if (error) throw error;

  return mapRowToLeadActivity(data as LeadActivityRow);
}

export async function deleteLeadActivity(activityId: string) {
  const { error } = await supabase
    .from('lead_activities')
    .delete()
    .eq('id', activityId);

  if (error) throw error;
}
