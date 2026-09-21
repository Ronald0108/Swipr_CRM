'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { setStoredActiveLeadId } from '../lib/utils';

interface AuthContextType {
  demoMode: boolean;
  session: Session | null;
  authLoading: boolean;
  authSubmitting: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  authError: string;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children, demoMode = false }: { children: React.ReactNode; demoMode?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = useCallback(async () => {
    if (demoMode) return;
    setAuthError('');
    setAuthSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError(error.message); setAuthSubmitting(false); return; }
    setAuthSubmitting(false);
  }, [email, password, demoMode]);

  const handleLogout = useCallback(async () => {
    if (session) setStoredActiveLeadId(session.user.id, null);
    await supabase.auth.signOut();
  }, [session]);

  useEffect(() => {
    if (demoMode) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session: newSession } }) => { 
      setSession(newSession); 
      setAuthLoading(false); 
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => { 
      setSession(prev => {
        if (prev?.access_token === newSession?.access_token) return prev;
        return newSession;
      });
      setAuthLoading(false); 
    });
    
    return () => subscription.unsubscribe();
  }, [demoMode]);

  return (
    <AuthContext.Provider value={{
      demoMode, session, authLoading, authSubmitting, email, setEmail, password, setPassword, authError,
      handleLogin, handleLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
