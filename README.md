# Machine Maintenance Dashboard

A full-stack machine maintenance management application built with Next.js and Express.js.

## Quick Deployment to Vercel

### Prerequisites
- Node.js 18+
- Vercel CLI installed: `npm install -g vercel`
- PostgreSQL database

### Deployment Steps

1. **Run the deployment script:**
   ```bash
   # For Windows
   deploy.bat
   
   # For Unix/Linux/macOS
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard:**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A secure random string

4. **Run database setup (if needed):**
   ```bash
   cd machine-maintenance-backend
   npm run setup-db
   ```

## Manual Deployment

If you prefer to deploy manually:

1. Install dependencies:
   ```bash
   cd machine-maintenance-dashboard && npm install
   cd ../machine-maintenance-backend && npm install
   ```

2. Build the frontend:
   ```bash
   cd machine-maintenance-dashboard && npm run build
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

## Vercel Build Commands

When deploying to Vercel, you can use these build commands in the Vercel dashboard:

**Install Command:**
```bash
cd machine-maintenance-dashboard && npm install && cd ../machine-maintenance-backend && npm install && cd ..
```

**Build Command:**
```bash
cd machine-maintenance-dashboard && npm run build
```

## Project Structure

```
OperationMaintenance/
├── machine-maintenance-dashboard/    # Next.js Frontend
├── machine-maintenance-backend/      # Express.js Backend
├── scripts/
│   └── setup-database.js           # Database setup script
├── deploy.sh                       # Unix deployment script
├── deploy.bat                      # Windows deployment script
├── vercel.json                     # Vercel configuration
└── package.json                    # Root package.json
```

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens

Your application will be available at the URL provided by Vercel after deployment.
