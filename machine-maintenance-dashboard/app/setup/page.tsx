import { SetupForm } from '@/components/auth/setup-form';
import { Wrench, Settings, Shield } from 'lucide-react';

export default function SetupPage() {
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
            Welcome to O&M Dashboard
          </h1>
          <p className="text-gray-600">
            Let's set up your machine maintenance management system
          </p>
        </div>

        {/* Setup Form */}
        <SetupForm />

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            This will create your first admin account and initialize the system
          </p>
        </div>
      </div>
    </div>
  );
} 