'use client';

import { createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LeadsProvider, useLeads } from './contexts/LeadsContext';
import { ActivityProvider, useActivity } from './contexts/ActivityContext';
import { ModalProvider, useModals } from './contexts/ModalContext';
import { CrmProvider, useCrm } from './contexts/CrmContext';
import { ImportProvider, useImport } from './contexts/ImportContext';
import { actionMeta, CARD_WIDTH, CARD_HEIGHT, CARD_STRIDE, CONTAINER_H, CENTER_Y, IMPORTABLE_FIELDS } from './lib/constants';
import { timeAgo } from './lib/utils';
import { LeadImportField } from './types/import';

type AppContextType = ReturnType<typeof useAuth> &
  ReturnType<typeof useLeads> &
  ReturnType<typeof useActivity> &
  ReturnType<typeof useModals> &
  ReturnType<typeof useCrm> &
  ReturnType<typeof useImport>;

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function AppContextCombiner({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const leads = useLeads();
  const activity = useActivity();
  const modals = useModals();
  const crm = useCrm();
  const importCtx = useImport();

  const value: AppContextType = {
    ...auth,
    ...leads,
    ...activity,
    ...modals,
    ...crm,
    ...importCtx,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LeadsProvider>
        <ActivityProvider>
          <ModalProvider>
            <CrmProvider>
              <ImportProvider>
                <AppContextCombiner>
                  {children}
                </AppContextCombiner>
              </ImportProvider>
            </CrmProvider>
          </ModalProvider>
        </ActivityProvider>
      </LeadsProvider>
    </AuthProvider>
  );
}

// Re-export constants and types needed by components from providers
export {
  actionMeta,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_STRIDE,
  CONTAINER_H,
  CENTER_Y,
  IMPORTABLE_FIELDS,
  timeAgo
};

export type { LeadImportField };
