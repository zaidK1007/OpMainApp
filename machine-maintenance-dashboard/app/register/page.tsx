'use client';

import { RegisterForm } from '@/components/auth/register-form';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Register New User
            </h1>
            <p className="text-gray-600">
              Create a new user account for the system
            </p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Back to Dashboard */}
          <div className="text-center">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 