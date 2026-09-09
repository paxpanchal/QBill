import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserPermissions } from '../types';
import { dbService, verifyPassword } from '../services/storage';

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'quickbill_prp_auth_session';
const LEGACY_AUTH_STORAGE_KEY = 'pramukraj_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await dbService.initialize();
        const savedUserId = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
        if (savedUserId) {
          const user = await dbService.getUserById(savedUserId);
          if (user && user.status === 'Active') {
            setCurrentUser(user);
          } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const user = await dbService.getUserByUsername(username);
      if (!user) {
        return { success: false, message: 'Invalid username or password' };
      }

      if (user.status !== 'Active') {
        return { success: false, message: 'Account is deactivated. Contact Administrator.' };
      }

      const isValid = await verifyPassword(password, user.passwordHash, user.password);
      if (!isValid) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Update last login
      const updatedUser: UserAccount = {
        ...user,
        lastLoginDate: new Date().toISOString(),
      };
      await dbService.saveUser(updatedUser);
      await dbService.logAudit(
        user.id,
        user.displayName,
        'USER_LOGIN',
        'USER',
        `User ${user.displayName} logged in successfully.`
      );

      setCurrentUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, updatedUser.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  const logout = () => {
    if (currentUser) {
      dbService.logAudit(
        currentUser.id,
        currentUser.displayName,
        'USER_LOGOUT',
        'USER',
        `User ${currentUser.displayName} logged out.`
      );
    }
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin' || currentUser.role === 'ADMIN') return true;
    return !!currentUser.permissions[permission];
  };

  const refreshUser = async () => {
    if (currentUser) {
      const user = await dbService.getUserById(currentUser.id);
      if (user) setCurrentUser(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
