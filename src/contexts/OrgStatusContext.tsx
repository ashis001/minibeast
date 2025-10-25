import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface OrgStatus {
  status: 'active' | 'paused' | 'expired';
  message: string;
  can_access: boolean;
}

interface OrgStatusContextType {
  orgStatus: OrgStatus | null;
  checkStatus: () => Promise<void>;
  isBlocked: boolean;
}

const OrgStatusContext = createContext<OrgStatusContextType | undefined>(undefined);

const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL || 'http://139.59.22.121:8000';

export function OrgStatusProvider({ children }: { children: React.ReactNode }) {
  const [orgStatus, setOrgStatus] = useState<OrgStatus | null>(null);

  const checkStatus = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;

      const user = JSON.parse(storedUser);
      const orgId = user.organization_id;
      
      if (!orgId) return;

      const response = await axios.get(
        `${AUTH_SERVER_URL}/license/organization/status/${orgId}`
      );
      
      setOrgStatus(response.data);
      
      // If blocked, prevent any further actions
      if (!response.data.can_access) {
        console.warn('Organization access blocked:', response.data.status);
      }
    } catch (error) {
      console.error('Failed to check org status:', error);
    }
  };

  // Check status on mount and every 30 seconds
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isBlocked = orgStatus ? !orgStatus.can_access : false;

  return (
    <OrgStatusContext.Provider value={{ orgStatus, checkStatus, isBlocked }}>
      {children}
    </OrgStatusContext.Provider>
  );
}

export function useOrgStatus() {
  const context = useContext(OrgStatusContext);
  if (!context) {
    throw new Error('useOrgStatus must be used within OrgStatusProvider');
  }
  return context;
}
