#!/bin/bash

# Machine Maintenance Dashboard - Simple Deployment Script
echo "🚀 Starting deployment..."

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd machine-maintenance-dashboard
npm install
cd ..

# Install backend dependencies  
echo "📦 Installing backend dependencies..."
cd machine-maintenance-backend
npm install
cd ..

# Build backend (generate Prisma client)
echo "🔨 Building backend..."
cd machine-maintenance-backend
npm run build
cd ..

# Build frontend
echo "🔨 Building frontend..."
cd machine-maintenance-dashboard
npm run build
cd ..

echo "✅ Deployment setup completed!"
echo "🎉 Ready to deploy to Vercel!"
