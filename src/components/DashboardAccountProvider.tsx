'use client';

import { createContext, useContext } from 'react';
import type { AccountRole } from '@/types';

interface DashboardAccountContextValue {
  role: AccountRole;
  username: string;
  displayName: string;
}

const DashboardAccountContext = createContext<DashboardAccountContextValue | null>(null);

interface DashboardAccountProviderProps {
  role: AccountRole;
  username: string;
  displayName: string;
  children: React.ReactNode;
}

export function DashboardAccountProvider({
  role,
  username,
  displayName,
  children,
}: DashboardAccountProviderProps) {
  return (
    <DashboardAccountContext.Provider value={{ role, username, displayName }}>
      {children}
    </DashboardAccountContext.Provider>
  );
}

export function useDashboardAccount() {
  const value = useContext(DashboardAccountContext);

  if (!value) {
    throw new Error('useDashboardAccount must be used within DashboardAccountProvider');
  }

  return value;
}
