'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface Organization {
  id: string;
  name: string;
  is_personal: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  organizations?: Organization;
}

interface OrganizationContextType {
  organizations: Organization[];
  activeOrganization: Organization | null;
  activeRole: 'owner' | 'admin' | 'member' | null;
  setActiveOrganizationId: (id: string) => void;
  loading: boolean;
  isSiteAdmin: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    if (!session?.user) {
      setOrganizations([]);
      setMemberships([]);
      setActiveOrganizationIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch site admin status
    const { data: userData } = await supabase
      .from('users')
      .select('global_role')
      .eq('id', session.user.id)
      .maybeSingle();
      
    setIsSiteAdmin(userData?.global_role === 'superadmin');

    const { data: memberData, error } = await supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', session.user.id);

    if (!error && memberData) {
      setMemberships(memberData as any[]);
      const allOrgs = memberData.map((m: any) => m.organizations).filter(Boolean) as Organization[];
      
      const businessOrgs = allOrgs.filter(o => !o.is_personal);
      const orgs = businessOrgs.length > 0 ? businessOrgs : allOrgs;
      
      setOrganizations(orgs);
      
      const savedOrgId = localStorage.getItem('swipr_active_org');
      if (savedOrgId && orgs.find(o => o.id === savedOrgId)) {
        setActiveOrganizationIdState(savedOrgId);
      } else if (orgs.length > 0) {
        setActiveOrganizationIdState(orgs[0].id);
      }
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const setActiveOrganizationId = useCallback((id: string) => {
    if (organizations.find(o => o.id === id)) {
      setActiveOrganizationIdState(id);
      localStorage.setItem('swipr_active_org', id);
    }
  }, [organizations]);

  const activeOrganization = organizations.find(o => o.id === activeOrganizationId) || null;
  const activeRole = memberships.find(m => m.organization_id === activeOrganizationId)?.role || null;

  return (
    <OrganizationContext.Provider value={{
      organizations,
      activeOrganization,
      activeRole,
      setActiveOrganizationId,
      loading,
      isSiteAdmin
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}
