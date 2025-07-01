'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Wrench, Settings, Shield, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/api';

export default function LoginPage() {
  const [isSystemInitialized, setIsSystemInitialized] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const response = await apiService.checkInitialization();
        setIsSystemInitialized(response.initialized);
      } catch (error) {
        console.error('Error checking initialization:', error);
        setIsSystemInitialized(true); // Assume initialized if we can't check
      } finally {
        setIsChecking(false);
      }
    };

    checkInitialization();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isSystemInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2">
                <Wrench className="h-8 w-8 text-blue-600" />
                <Settings className="h-8 w-8 text-indigo-600" />
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              O&M Dashboard
            </h1>
            <p className="text-gray-600">
              Machine Maintenance Management System
            </p>
          </div>

          {/* Setup Required Card */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">System Setup Required</CardTitle>
              <CardDescription>
                This is the first time running the system. You need to set up an admin account.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/setup">
                <Button className="w-full">
                  <Shield className="mr-2 h-4 w-4" />
                  Set Up System
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-8 w-8 text-blue-600" />
              <Settings className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            O&M Dashboard
          </h1>
          <p className="text-gray-600">
            Machine Maintenance Management System
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
} 