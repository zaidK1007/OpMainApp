'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, User, LoginCredentials, RegisterData } from './types';
import { apiService } from './api';
import { useRouter } from 'next/navigation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSystemInitialized, setIsSystemInitialized] = useState<boolean | null>(null);
  const router = useRouter();

  // Check system initialization status
  const checkSystemInitialization = async () => {
    try {
      const response = await apiService.checkInitialization();
      setIsSystemInitialized(response.initialized);
      
      // If system is not initialized and we're not on setup page, redirect to setup
      if (!response.initialized && window.location.pathname !== '/setup') {
        router.push('/setup');
        return;
      }
      
      // If system is initialized and we're on setup page, redirect to login
      if (response.initialized && window.location.pathname === '/setup') {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('Error checking system initialization:', error);
      // If we can't check initialization, assume it's initialized to avoid blocking
      setIsSystemInitialized(true);
    }
  };

  // Validate stored token
  const validateToken = async (storedToken: string) => {
    try {
      // Use the simple token validation endpoint
      const response = await apiService.validateToken(storedToken);
      return response.valid;
    } catch (error) {
      console.error('Token validation failed:', error);
      // Don't throw the error, just return false to indicate invalid token
      return false;
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');
        
        if (savedToken && savedUser) {
          try {
            // Validate the token
            const isValid = await validateToken(savedToken);
            
            if (isValid) {
              setToken(savedToken);
              setUser(JSON.parse(savedUser));
            } else {
              // Token is invalid, clear storage and redirect to login
              console.log('Invalid token found, clearing storage');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              if (window.location.pathname !== '/login' && window.location.pathname !== '/setup') {
                router.push('/login');
              }
            }
          } catch (error) {
            console.error('Error parsing saved auth data:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/setup') {
              router.push('/login');
            }
          }
        }
        
        // Check system initialization
        await checkSystemInitialization();
      } catch (error) {
        console.error('Error during auth initialization:', error);
        // If there's any error during initialization, clear storage and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/setup') {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiService.login(credentials);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await apiService.register(data, token || '');
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    } catch (error) {
      throw error;
    }
  };

  const createUser = async (data: RegisterData) => {
    if (!token) {
      throw new Error('Authentication required to create users');
    }
    
    try {
      const response = await apiService.register(data, token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiService.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      router.push('/login');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    createUser,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 