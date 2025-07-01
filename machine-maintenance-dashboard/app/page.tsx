"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isCheckingInitialization, setIsCheckingInitialization] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkInitializationAndRedirect = async () => {
      try {
        const response = await apiService.checkInitialization();
        
        if (!response.initialized) {
          // System not initialized, redirect to setup
          router.push('/setup');
          return;
        }
        
        // System is initialized, check authentication
        if (!isLoading) {
          if (isAuthenticated) {
            router.push('/dashboard');
          } else {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Error checking initialization:', error);
        // If we can't check, assume initialized and redirect to login
        if (!isLoading && !isAuthenticated) {
          router.push('/login');
        }
      } finally {
        setIsCheckingInitialization(false);
      }
    };

    checkInitializationAndRedirect();
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isCheckingInitialization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return null;
}
