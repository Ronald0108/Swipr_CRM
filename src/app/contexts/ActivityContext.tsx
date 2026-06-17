'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead } from '../data/leads';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { ActivityType, ActivityFilter, LeadActivity } from '../types/activity';
import {
  fetchLeadActivities,
  fetchRecentActivities,
  insertLeadActivity,
} from '../services/activityService';
import { actionMeta } from '../lib/constants';

export interface ActivityItem {
  id: string;
  leadId: string;
  action: ActivityType;
  leadName: string;
  company: string;
  timestamp: Date;
}

interface ActivityContextType {
  activityLog: ActivityItem[];
  setActivityLog: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  leadActivityItems: ActivityItem[];
  setLeadActivityItems: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  detailActivityFilter: ActivityFilter;
  setDetailActivityFilter: React.Dispatch<React.SetStateAction<ActivityFilter>>;
  addActivity: (action: ActivityType, lead: Lead) => Promise<void>;
  refreshLeadActivities: (leadId: string, filter: ActivityFilter) => Promise<void>;
  getLocalLeadActivityItems: (leadId: string) => ActivityItem[];
  statsCount: { connected: number; lost: number; voicemail: number; next: number };
  setStatsCount: React.Dispatch<React.SetStateAction<{ connected: number; lost: number; voicemail: number; next: number }>>;
  getLeadStatusLabel: (lead: Lead) => string;
}

const ActivityContext = createContext<ActivityContextType | null>(null);

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider');
  return ctx;
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { leads, leadsLoading } = useLeads();

  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [leadActivityItems, setLeadActivityItems] = useState<ActivityItem[]>([]);
  const [detailActivityFilter, setDetailActivityFilter] = useState<ActivityFilter>('all');
  const [statsCount, setStatsCount] = useState({ connected: 0, lost: 0, voicemail: 0, next: 0 });

  const statusActions: ActivityType[] = ['connected', 'lost', 'voicemail', 'next'];

  const mapActivitiesToItems = useCallback((activities: LeadActivity[], availableLeads: Lead[]) => {
    return activities.map((activity) => {
      const lead = availableLeads.find((item) => item.id === activity.leadId);
      return {
        id: activity.id,
        leadId: activity.leadId,
        action: activity.activityType,
        leadName: lead?.name ?? 'Unknown Lead',
        company: lead?.company ?? 'Unknown Company',
        timestamp: new Date(activity.createdAt),
      };
    });
  }, []);

  const getLocalLeadActivityItems = useCallback((leadId: string) => {
    return activityLog.filter((item) => item.leadId === leadId);
  }, [activityLog]);

  const refreshLeadActivities = useCallback(async (leadId: string, filter: ActivityFilter) => {
    if (!session) { setLeadActivityItems(getLocalLeadActivityItems(leadId)); return; }
    try {
      const activities = await fetchLeadActivities(session.user.id, leadId, filter, 200);
      if (activities.length === 0) { setLeadActivityItems(getLocalLeadActivityItems(leadId)); return; }
      setLeadActivityItems(mapActivitiesToItems(activities, leads));
    } catch (error) { console.error('Error fetching lead activities:', error); setLeadActivityItems(getLocalLeadActivityItems(leadId)); }
  }, [getLocalLeadActivityItems, leads, mapActivitiesToItems, session]);

  const addActivity = useCallback(async (action: ActivityType, lead: Lead) => {
    const nextItem: ActivityItem = {
      id: `${Date.now()}-${Math.random()}`, leadId: lead.id, action,
      leadName: lead.name, company: lead.company, timestamp: new Date(),
    };
    setActivityLog((prev) => [nextItem, ...prev].slice(0, 80));
    if (!session) return;
    try {
      await insertLeadActivity(session.user.id, lead.id, action);
      // We don't have detailLeadId here, but refreshLeadActivities could be called by the page
    } catch (error) { console.error('Error adding activity:', error); }
  }, [session]);

  const getLeadStatusLabel = useCallback((lead: Lead) => {
    const latestStatus = activityLog.find((item) => item.leadId === lead.id && statusActions.includes(item.action));
    return latestStatus ? actionMeta[latestStatus.action].label : 'None';
  }, [activityLog, statusActions]);

  // Load activities when leads are loaded initially
  useEffect(() => {
    if (!session) {
      setActivityLog([]);
      return;
    }
    if (!leadsLoading && leads.length > 0 && activityLog.length === 0) {
      fetchRecentActivities(session.user.id, 80)
        .then(recentActivities => {
          setActivityLog(mapActivitiesToItems(recentActivities, leads));
        })
        .catch(activityError => {
          console.error('Error fetching recent activities:', activityError?.message || activityError);
        });
    }
  }, [leadsLoading, leads, session, mapActivitiesToItems, activityLog.length]);

  return (
    <ActivityContext.Provider value={{
      activityLog, setActivityLog, leadActivityItems, setLeadActivityItems,
      detailActivityFilter, setDetailActivityFilter,
      addActivity, refreshLeadActivities, getLocalLeadActivityItems,
      statsCount, setStatsCount, getLeadStatusLabel
    }}>
      {children}
    </ActivityContext.Provider>
  );
}
