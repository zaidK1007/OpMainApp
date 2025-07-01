'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  Wrench, 
  FileText, 
  BarChart3, 
  LogOut,
  Shield,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

function DashboardContent() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const dashboardCards = [
    {
      title: 'Maintenance',
      description: 'Manage machine maintenance schedules',
      icon: Wrench,
      href: '/maintenance',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Operation Log',
      description: 'Track daily operations and activities',
      icon: FileText,
      href: '/operation-log',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Reports',
      description: 'Generate and view system reports',
      icon: BarChart3,
      href: '/reports',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Sites',
      description: 'Manage different site locations',
      icon: Settings,
      href: '/sites',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}!</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
              {user?.role}
            </Badge>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Account Information</span>
          </CardTitle>
          <CardDescription>
            Your account details and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-lg">{user?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                {user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-lg ${card.bgColor} flex items-center justify-center mb-2`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Admin Actions */}
      {user?.role === 'admin' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/register">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center mb-2">
                    <User className="h-6 w-6 text-indigo-600" />
                  </div>
                  <CardTitle className="text-lg">Register User</CardTitle>
                  <CardDescription>Create new user accounts</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
} 