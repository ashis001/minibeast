import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface License {
  type: string;
  expires_at: string;
  features: string[];
  is_valid: boolean;
}

interface Organization {
  name: string;
  id: string;
}

interface Permissions {
  modules: string[];
  description: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  organization_name?: string;
  permissions: Permissions;
  license?: License;
  organization?: Organization;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL || 'http://localhost:8000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setIsLoading(false);
  }, []);

  // Periodic role verification - check every 30 seconds
  useEffect(() => {
    if (!accessToken || !user) return;

    const verifyRole = async () => {
      try {
        // Fetch fresh user data from backend
        const response = await axios.get(`${AUTH_SERVER_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        const currentRole = response.data.role;
        
        // Compare with stored user role
        if (user.role !== currentRole) {
          console.warn('Role changed detected - forcing logout for security');
          alert('Your role has been updated. Please login again.');
          logout();
          window.location.href = '/login';
        }
      } catch (error: any) {
        // If token is invalid or expired, logout
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.warn('Authentication failed - logging out');
          logout();
          window.location.href = '/login';
        }
      }
    };

    // Initial check after 5 seconds
    const timeoutId = setTimeout(verifyRole, 5000);

    // Set up interval for periodic checks (every 30 seconds)
    const intervalId = setInterval(verifyRole, 30000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [accessToken, user]);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${AUTH_SERVER_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token, refresh_token, user: userData, license } = response.data;

      // Merge license and organization data into user object
      const enrichedUser = {
        ...userData,
        license,
        organization: {
          id: userData.organization_id,
          name: userData.organization_name || 'Default Organization'
        }
      };

      // CRITICAL: Check organization status BEFORE allowing login
      if (enrichedUser.organization_id) {
        try {
          const orgStatusResponse = await axios.get(
            `${AUTH_SERVER_URL}/license/organization/status/${enrichedUser.organization_id}`
          );
          
          // If organization is blocked, throw error with specific message
          if (!orgStatusResponse.data.can_access) {
            const status = orgStatusResponse.data.status;
            const message = orgStatusResponse.data.message;
            
            if (status === 'expired') {
              throw new Error('License Expired: Your organization\'s license has expired. Please contact Dataction to renew at support@dataction.com');
            } else if (status === 'paused') {
              throw new Error('Organization Paused: Your organization is currently paused. Please contact Dataction at support@dataction.com');
            } else {
              throw new Error(message || 'Organization access denied');
            }
          }
        } catch (error: any) {
          // If it's our custom error, throw it
          if (error.message?.includes('License Expired') || error.message?.includes('Organization Paused')) {
            throw error;
          }
          // Otherwise, log but don't block (in case auth server is down)
          console.error('Failed to check org status during login:', error);
        }
      }

      // Store tokens and enriched user data
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(enrichedUser));

      setAccessToken(access_token);
      setUser(enrichedUser);
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || error.message || 'Login failed';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        logout,
        isAuthenticated: !!accessToken && !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
