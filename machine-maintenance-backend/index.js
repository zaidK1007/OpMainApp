const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('./lib/auth-service');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/sites') {
    console.log('=== INCOMING SITE REQUEST ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'authorization': req.headers['authorization'] ? 'present' : 'missing'
    });
    console.log('Body:', req.body);
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'no body');
    console.log('=============================');
  }
  next();
});

// Middleware: Authenticate JWT with database validation
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = await authService.verifyToken(token);
    req.user = decoded.user;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Middleware: Authorize by role
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Check if system is initialized (has any users)
app.get('/api/auth/check-initialization', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ 
      initialized: userCount > 0,
      userCount 
    });
  } catch (error) {
    console.error('Check initialization error:', error);
    res.status(500).json({ error: 'Failed to check initialization status' });
  }
});

// First-time setup: Create initial admin user (no auth required)
app.post('/api/auth/setup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if any users already exist
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return res.status(403).json({ error: 'System already initialized' });
    }

    // Create the first admin user
    const user = await authService.register({
      name,
      email,
      password,
      role: 'admin'
    }, null, req);

    // Generate token and create session
    const token = authService.generateToken(user);
    const session = await authService.createSession(user.id, token, req);

    // Record setup completion
    await authService.recordAuditLog(
      user.id, 
      'SYSTEM_SETUP', 
      'System', 
      null, 
      { setupBy: user.email }, 
      req
    );

    res.status(201).json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      message: 'System initialized successfully'
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message || 'Setup failed' });
  }
});

// Auth: Login with full database integration
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password, req);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Auth: Logout with session invalidation
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    await authService.logout(token, req);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Auth: Register (admin only, or open for first user)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['admin', 'engineer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or engineer' });
    }

    // Check if any users exist
    const userCount = await prisma.user.count();
    
    // If no users exist, allow registration without authentication
    if (userCount === 0) {
      const user = await authService.register({
        name,
        email,
        password,
        role
      }, null, req);
      
      res.status(201).json(user);
      return;
    }

    // If users exist, require admin authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    console.log('Registration attempt with token:', token ? 'Token provided' : 'No token');
    
    const decoded = await authService.verifyTokenWithoutSession(token);
    console.log('Token verification successful for user:', decoded.user.email);
    
    if (decoded.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const user = await authService.register({
      name,
      email,
      password,
      role
    }, decoded.user, req);
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Get user profile with session info
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Simple token validation (no session required)
app.get('/api/auth/validate-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: decoded.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({ valid: true, user });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Get user sessions (admin only)
app.get('/api/auth/sessions', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const sessions = await authService.getUserSessions(req.user.id);
    res.json(sessions);
  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get audit logs (admin only)
app.get('/api/auth/audit-logs', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      resource: req.query.resource,
      limit: parseInt(req.query.limit) || 50
    };

    const logs = await authService.getAuditLogs(filters);
    res.json(logs);
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// Example: Protected route (admin only)
app.get('/api/protected/admin', authenticateToken, authorizeRoles('admin'), (req, res) => {
  res.json({ message: `Hello Admin ${req.user.email}` });
});

// Example: Protected route (engineer or admin)
app.get('/api/protected/engineer', authenticateToken, authorizeRoles('engineer', 'admin'), (req, res) => {
  res.json({ message: `Hello ${req.user.role} ${req.user.email}` });
});

// ===== SITES API ENDPOINTS =====

// Get all sites
app.get('/api/sites', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    const sites = await prisma.site.findMany({
      include: {
        _count: {
          select: { machines: true }
        }
      }
    });

    const sitesWithMachineCount = sites.map(site => ({
      id: site.id,
      name: site.name,
      location: site.location,
      machineCount: site._count.machines
    }));

    res.json(sitesWithMachineCount);
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Create new site (admin only)
app.post('/api/sites', async (req, res) => {
  try {
    console.log('=== SITE CREATION ENDPOINT ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'authorization': req.headers['authorization'] ? 'present' : 'missing'
    });
    console.log('=============================');

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { name, location } = req.body;
    
    console.log('Extracted site data:', { name, location })
    
    if (!name || !location) {
      console.log('Validation failed - missing fields:', { name: !!name, location: !!location })
      return res.status(400).json({ error: 'Name and location are required' });
    }

    const site = await prisma.site.create({
      data: {
        name,
        location
      }
    });

    console.log('Site created successfully:', site)

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'CREATE_SITE',
      'Site',
      site.id,
      { siteName: site.name, location: site.location },
      req
    );

    res.status(201).json(site);
  } catch (error) {
    console.error('Create site error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to create site' });
    }
  }
});

// Update site (admin only)
app.put('/api/sites/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { id } = req.params;
    const { name, location } = req.body;
    
    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }

    const site = await prisma.site.update({
      where: { id },
      data: { name, location }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'UPDATE_SITE',
      'Site',
      site.id,
      { siteName: site.name, location: site.location },
      req
    );

    res.json(site);
  } catch (error) {
    console.error('Update site error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Site not found' });
    } else {
      res.status(500).json({ error: 'Failed to update site' });
    }
  }
});

// Delete site (admin only)
app.delete('/api/sites/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { id } = req.params;

    // Check if site has machines
    const machineCount = await prisma.machine.count({
      where: { siteId: id }
    });

    if (machineCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete site with machines. Please remove all machines first.' 
      });
    }

    const site = await prisma.site.delete({
      where: { id }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'DELETE_SITE',
      'Site',
      site.id,
      { siteName: site.name, location: site.location },
      req
    );

    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Site not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete site' });
    }
  }
});

// ===== MACHINES API ENDPOINTS =====

// Get all machines (all users)
app.get('/api/machines', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    const machines = await prisma.machine.findMany({
      include: {
        site: {
          select: { name: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(machines);
  } catch (error) {
    console.error('Get machines error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to fetch machines' });
    }
  }
});

// Get unique machine types (all users)
app.get('/api/machine-types', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    const machineTypes = await prisma.machine.findMany({
      select: {
        machineType: true
      },
      distinct: ['machineType'],
      orderBy: {
        machineType: 'asc'
      }
    });

    const types = machineTypes.map(mt => mt.machineType).filter(type => type && type.trim() !== '');
    
    res.json(types);
  } catch (error) {
    console.error('Get machine types error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to fetch machine types' });
    }
  }
});

// Create new machine (admin only)
app.post('/api/machines', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { 
      name, 
      siteId, 
      desiredDailyHours,
      status,
      nextMaintenanceDate,
      machineType
    } = req.body;
    
    if (!name || !siteId || !desiredDailyHours) {
      return res.status(400).json({ error: 'Name, site, and daily hours are required' });
    }

    // Validate site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }

    const machine = await prisma.machine.create({
      data: {
        name,
        siteId,
        desiredDailyHours: parseInt(desiredDailyHours),
        status: status || 'operational',
        machineType: machineType || 'general',
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
        lastMaintenanceDate: new Date(),
        totalHoursRun: 0
      }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'CREATE_MACHINE',
      'Machine',
      machine.id,
      { 
        machineName: machine.name, 
        siteName: site.name,
        status: machine.status 
      },
      req
    );

    res.status(201).json(machine);
  } catch (error) {
    console.error('Create machine error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to create machine' });
    }
  }
});

// Update machine (admin only)
app.put('/api/machines/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { id } = req.params;
    const { 
      name, 
      siteId, 
      desiredDailyHours,
      status,
      nextMaintenanceDate,
      machineType
    } = req.body;
    
    if (!name || !siteId || !desiredDailyHours) {
      return res.status(400).json({ error: 'Name, site, and daily hours are required' });
    }

    // Validate site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }

    const machine = await prisma.machine.update({
      where: { id },
      data: {
        name,
        siteId,
        desiredDailyHours: parseInt(desiredDailyHours),
        status,
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : undefined,
        machineType
      }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'UPDATE_MACHINE',
      'Machine',
      machine.id,
      { 
        machineName: machine.name, 
        siteName: site.name,
        status: machine.status 
      },
      req
    );

    res.json(machine);
  } catch (error) {
    console.error('Update machine error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Machine not found' });
    } else {
      res.status(500).json({ error: 'Failed to update machine' });
    }
  }
});

// Delete machine (admin only)
app.delete('/api/machines/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { id } = req.params;

    const machine = await prisma.machine.delete({
      where: { id },
      include: {
        site: {
          select: { name: true }
        }
      }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'DELETE_MACHINE',
      'Machine',
      machine.id,
      { 
        machineName: machine.name, 
        siteName: machine.site.name 
      },
      req
    );

    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    console.error('Delete machine error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Machine not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete machine' });
    }
  }
});

// ===== OPERATION LOGS API ENDPOINTS =====

// Get operation logs (all users)
app.get('/api/operation-logs', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    const { machineId, siteId, startDate, endDate } = req.query;

    const whereClause = {};
    
    if (machineId) {
      whereClause.machineId = machineId;
    } else if (siteId) {
      whereClause.machine = {
        siteId: siteId
      };
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const operationLogs = await prisma.operationLog.findMany({
      where: whereClause,
      include: {
        machine: {
          include: {
            site: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.json(operationLogs);
  } catch (error) {
    console.error('Get operation logs error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to fetch operation logs' });
    }
  }
});

// Create operation log (all users)
app.post('/api/operation-logs', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    const {
      machineId,
      date,
      startTime,
      endTime,
      totalHours,
      engineer,
      operator,
      notOperatedReason,
      maintenanceChecklistCompleted
    } = req.body;

    if (!machineId || !date || !startTime || !endTime || !engineer || !operator) {
      return res.status(400).json({ error: 'Machine ID, date, times, engineer, and operator are required' });
    }

    // Validate machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        site: {
          select: { name: true }
        }
      }
    });

    if (!machine) {
      return res.status(400).json({ error: 'Invalid machine ID' });
    }

    const operationLog = await prisma.operationLog.create({
      data: {
        machineId,
        date: new Date(date),
        startTime,
        endTime,
        totalHours: parseInt(totalHours) || 0,
        engineer,
        operator,
        notOperatedReason: notOperatedReason || null,
        maintenanceChecklistCompleted: maintenanceChecklistCompleted || false
      },
      include: {
        machine: {
          include: {
            site: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Update machine's total hours run
    await prisma.machine.update({
      where: { id: machineId },
      data: {
        totalHoursRun: {
          increment: parseInt(totalHours) || 0
        }
      }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'CREATE_OPERATION_LOG',
      'OperationLog',
      operationLog.id,
      { 
        machineName: machine.name, 
        siteName: machine.site.name,
        totalHours: operationLog.totalHours,
        date: operationLog.date
      },
      req
    );

    res.status(201).json(operationLog);
  } catch (error) {
    console.error('Create operation log error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to create operation log' });
    }
  }
});

// ===== MAINTENANCE TASKS API ENDPOINTS =====

// Get maintenance tasks (all users)
app.get('/api/maintenance-tasks', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    const { machineId, siteId, completed } = req.query;

    const whereClause = {};
    
    if (machineId) {
      whereClause.machineId = machineId;
    } else if (siteId) {
      whereClause.machine = {
        siteId: siteId
      };
    }

    if (completed !== undefined) {
      whereClause.completed = completed === 'true';
    }

    const maintenanceTasks = await prisma.maintenanceTask.findMany({
      where: whereClause,
      include: {
        machine: {
          include: {
            site: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { completed: 'asc' }
      ]
    });

    res.json(maintenanceTasks);
  } catch (error) {
    console.error('Get maintenance tasks error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to fetch maintenance tasks' });
    }
  }
});

// Create maintenance task (admin only)
app.post('/api/maintenance-tasks', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const {
      machineId,
      task,
      priority,
      frequency
    } = req.body;

    if (!machineId || !task || !priority) {
      return res.status(400).json({ error: 'Machine ID, task, and priority are required' });
    }

    // Validate machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        site: {
          select: { name: true }
        }
      }
    });

    if (!machine) {
      return res.status(400).json({ error: 'Invalid machine ID' });
    }

    const maintenanceTask = await prisma.maintenanceTask.create({
      data: {
        machineId,
        task,
        priority,
        frequency: frequency || 'daily',
        completed: false
      },
      include: {
        machine: {
          include: {
            site: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'CREATE_MAINTENANCE_TASK',
      'MaintenanceTask',
      maintenanceTask.id,
      { 
        machineName: machine.name, 
        siteName: machine.site.name,
        task: maintenanceTask.task,
        priority: maintenanceTask.priority
      },
      req
    );

    res.status(201).json(maintenanceTask);
  } catch (error) {
    console.error('Create maintenance task error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to create maintenance task' });
    }
  }
});

// Update maintenance task (all users)
app.put('/api/maintenance-tasks/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    const { id } = req.params;
    const {
      task,
      completed,
      completedBy,
      priority
    } = req.body;

    const updateData = {};
    
    if (task !== undefined) updateData.task = task;
    if (priority !== undefined) updateData.priority = priority;
    if (completed !== undefined) {
      updateData.completed = completed;
      if (completed) {
        updateData.completedBy = completedBy || req.user.name;
        updateData.completedDate = new Date();
      } else {
        updateData.completedBy = null;
        updateData.completedDate = null;
      }
    }

    const maintenanceTask = await prisma.maintenanceTask.update({
      where: { id },
      data: updateData,
      include: {
        machine: {
          include: {
            site: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'UPDATE_MAINTENANCE_TASK',
      'MaintenanceTask',
      maintenanceTask.id,
      { 
        machineName: maintenanceTask.machine.name, 
        siteName: maintenanceTask.machine.site.name,
        task: maintenanceTask.task,
        completed: maintenanceTask.completed,
        completedBy: maintenanceTask.completedBy
      },
      req
    );

    res.json(maintenanceTask);
  } catch (error) {
    console.error('Update maintenance task error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance task not found' });
    } else {
      res.status(500).json({ error: 'Failed to update maintenance task' });
    }
  }
});

// Delete maintenance task (admin only)
app.delete('/api/maintenance-tasks/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { id } = req.params;

    const maintenanceTask = await prisma.maintenanceTask.delete({
      where: { id },
      include: {
        machine: {
          include: {
            site: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'DELETE_MAINTENANCE_TASK',
      'MaintenanceTask',
      maintenanceTask.id,
      { 
        machineName: maintenanceTask.machine.name, 
        siteName: maintenanceTask.machine.site.name,
        task: maintenanceTask.task
      },
      req
    );

    res.json({ message: 'Maintenance task deleted successfully' });
  } catch (error) {
    console.error('Delete maintenance task error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance task not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete maintenance task' });
    }
  }
});

// ===== MAINTENANCE TASK TEMPLATES API ENDPOINTS =====

// Get maintenance task templates (all users)
app.get('/api/maintenance-task-templates', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    const { machineType, frequency } = req.query;

    const whereClause = {};
    
    if (machineType) {
      whereClause.machineType = machineType;
    }

    if (frequency) {
      whereClause.frequency = frequency;
    }

    const taskTemplates = await prisma.maintenanceTaskTemplate.findMany({
      where: whereClause,
      orderBy: [
        { machineType: 'asc' },
        { frequency: 'asc' },
        { priority: 'desc' }
      ]
    });

    res.json(taskTemplates);
  } catch (error) {
    console.error('Get maintenance task templates error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to fetch maintenance task templates' });
    }
  }
});

// Create maintenance task template (admin only)
app.post('/api/maintenance-task-templates', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const {
      task,
      priority,
      frequency,
      machineType,
      description
    } = req.body;

    if (!task || !priority || !frequency || !machineType) {
      return res.status(400).json({ error: 'Task, priority, frequency, and machine type are required' });
    }

    const taskTemplate = await prisma.maintenanceTaskTemplate.create({
      data: {
        task,
        priority,
        frequency,
        machineType,
        description: description || null
      }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'CREATE_MAINTENANCE_TASK_TEMPLATE',
      'MaintenanceTaskTemplate',
      taskTemplate.id,
      { 
        task: taskTemplate.task,
        machineType: taskTemplate.machineType,
        frequency: taskTemplate.frequency,
        priority: taskTemplate.priority
      },
      req
    );

    res.status(201).json(taskTemplate);
  } catch (error) {
    console.error('Create maintenance task template error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to create maintenance task template' });
    }
  }
});

// Update maintenance task template (admin only)
app.put('/api/maintenance-task-templates/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { id } = req.params;
    const { task, priority, frequency, machineType, description } = req.body;
    
    if (!task || !priority || !frequency || !machineType) {
      return res.status(400).json({ error: 'Task, priority, frequency, and machine type are required' });
    }

    // Get the original template before updating it
    const originalTemplate = await prisma.maintenanceTaskTemplate.findUnique({
      where: { id }
    });

    if (!originalTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update the template
    const updatedTemplate = await prisma.maintenanceTaskTemplate.update({
      where: { id },
      data: {
        task,
        priority,
        frequency,
        machineType,
        description: description || undefined
      }
    });

    // Check if machine type changed
    const machineTypeChanged = originalTemplate.machineType !== updatedTemplate.machineType

    if (machineTypeChanged) {
      console.log(`Machine type changed from ${originalTemplate.machineType} to ${updatedTemplate.machineType}`)
      
      // Remove tasks from the old machine type
      const oldMachineType = originalTemplate.machineType
      const machinesOfOldType = await prisma.machine.findMany({
        where: { machineType: oldMachineType }
      });

      console.log(`Found ${machinesOfOldType.length} machines of old type ${oldMachineType}`)

      for (const machine of machinesOfOldType) {
        // Find tasks that were created from this specific template
        const tasksToRemove = await prisma.maintenanceTask.findMany({
          where: {
            machineId: machine.id,
            taskTemplateId: id
          }
        });

        if (tasksToRemove.length > 0) {
          const deletedTasks = await prisma.maintenanceTask.deleteMany({
            where: {
              id: { in: tasksToRemove.map(t => t.id) }
            }
          });
          console.log(`Removed ${deletedTasks.count} tasks from machine ${machine.name} (old type ${oldMachineType})`)
        }
      }

      // Now synchronize the new machine type
      const allTemplatesForNewMachineType = await prisma.maintenanceTaskTemplate.findMany({
        where: { machineType: updatedTemplate.machineType }
      });

      const machinesOfNewType = await prisma.machine.findMany({
        where: { machineType: updatedTemplate.machineType }
      });

      console.log(`Found ${machinesOfNewType.length} machines of new type ${updatedTemplate.machineType}`)
      console.log(`Found ${allTemplatesForNewMachineType.length} templates for new machine type ${updatedTemplate.machineType}`)

      // For each machine of the new type, synchronize its maintenance tasks
      for (const machine of machinesOfNewType) {
        console.log(`Synchronizing tasks for machine: ${machine.name}`)
        
        // Get current tasks for this machine
        const currentTasks = await prisma.maintenanceTask.findMany({
          where: { machineId: machine.id }
        });

        console.log(`Machine ${machine.name} has ${currentTasks.length} current tasks`)

        // Create a set of current task descriptions for easy lookup
        const currentTaskDescriptions = new Set(currentTasks.map(t => t.task))
        
        // Create a set of template task descriptions
        const templateTaskDescriptions = new Set(allTemplatesForNewMachineType.map(t => t.task))

        // Find tasks that should be removed (exist in current tasks but not in templates)
        const tasksToRemove = currentTasks.filter(task => !templateTaskDescriptions.has(task.task))
        
        // Find tasks that should be added (exist in templates but not in current tasks)
        const tasksToAdd = allTemplatesForNewMachineType.filter(template => !currentTaskDescriptions.has(template.task))

        console.log(`Tasks to remove: ${tasksToRemove.length}`)
        console.log(`Tasks to add: ${tasksToAdd.length}`)

        // Remove tasks that are no longer in templates
        if (tasksToRemove.length > 0) {
          const deletedTasks = await prisma.maintenanceTask.deleteMany({
            where: {
              id: { in: tasksToRemove.map(t => t.id) }
            }
          });
          console.log(`Deleted ${deletedTasks.count} tasks from machine ${machine.name}`)
        }

        // Add new tasks from templates
        for (const template of tasksToAdd) {
          const newTask = await prisma.maintenanceTask.create({
            data: {
              task: template.task,
              priority: template.priority,
              frequency: template.frequency,
              machineId: machine.id,
              taskTemplateId: template.id,
              completed: false
            }
          });
          console.log(`Added task "${template.task}" to machine ${machine.name}`)
        }

        // Update existing tasks to match their templates
        const tasksToUpdate = currentTasks.filter(task => 
          task.taskTemplateId && templateTaskDescriptions.has(task.task)
        )

        for (const task of tasksToUpdate) {
          const template = allTemplatesForNewMachineType.find(t => t.id === task.taskTemplateId)
          if (template) {
            await prisma.maintenanceTask.update({
              where: { id: task.id },
              data: {
                task: template.task,
                priority: template.priority,
                frequency: template.frequency
              }
            });
            console.log(`Updated task "${task.task}" for machine ${machine.name}`)
          }
        }
      }
    } else {
      // Machine type didn't change, use the existing synchronization logic
      // Get all current templates for this machine type
      const allTemplatesForMachineType = await prisma.maintenanceTaskTemplate.findMany({
        where: { machineType: updatedTemplate.machineType }
      });

      // Get all machines of this machine type
      const machinesOfType = await prisma.machine.findMany({
        where: { machineType: updatedTemplate.machineType }
      });

      console.log(`Found ${machinesOfType.length} machines of type ${updatedTemplate.machineType}`)
      console.log(`Found ${allTemplatesForMachineType.length} templates for machine type ${updatedTemplate.machineType}`)

      // For each machine of this type, synchronize its maintenance tasks
      for (const machine of machinesOfType) {
        console.log(`Synchronizing tasks for machine: ${machine.name}`)
        
        // Get current tasks for this machine
        const currentTasks = await prisma.maintenanceTask.findMany({
          where: { machineId: machine.id }
        });

        console.log(`Machine ${machine.name} has ${currentTasks.length} current tasks`)

        // Create a set of current task descriptions for easy lookup
        const currentTaskDescriptions = new Set(currentTasks.map(t => t.task))
        
        // Create a set of template task descriptions
        const templateTaskDescriptions = new Set(allTemplatesForMachineType.map(t => t.task))

        // Find tasks that should be removed (exist in current tasks but not in templates)
        const tasksToRemove = currentTasks.filter(task => !templateTaskDescriptions.has(task.task))
        
        // Find tasks that should be added (exist in templates but not in current tasks)
        const tasksToAdd = allTemplatesForMachineType.filter(template => !currentTaskDescriptions.has(template.task))

        console.log(`Tasks to remove: ${tasksToRemove.length}`)
        console.log(`Tasks to add: ${tasksToAdd.length}`)

        // Remove tasks that are no longer in templates
        if (tasksToRemove.length > 0) {
          const deletedTasks = await prisma.maintenanceTask.deleteMany({
            where: {
              id: { in: tasksToRemove.map(t => t.id) }
            }
          });
          console.log(`Deleted ${deletedTasks.count} tasks from machine ${machine.name}`)
        }

        // Add new tasks from templates
        for (const template of tasksToAdd) {
          const newTask = await prisma.maintenanceTask.create({
            data: {
              task: template.task,
              priority: template.priority,
              frequency: template.frequency,
              machineId: machine.id,
              taskTemplateId: template.id,
              completed: false
            }
          });
          console.log(`Added task "${template.task}" to machine ${machine.name}`)
        }

        // Update existing tasks to match their templates
        const tasksToUpdate = currentTasks.filter(task => 
          task.taskTemplateId && templateTaskDescriptions.has(task.task)
        )

        for (const task of tasksToUpdate) {
          const template = allTemplatesForMachineType.find(t => t.id === task.taskTemplateId)
          if (template) {
            await prisma.maintenanceTask.update({
              where: { id: task.id },
              data: {
                task: template.task,
                priority: template.priority,
                frequency: template.frequency
              }
            });
            console.log(`Updated task "${task.task}" for machine ${machine.name}`)
          }
        }
      }
    }

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'UPDATE_MAINTENANCE_TASK_TEMPLATE',
      'MaintenanceTaskTemplate',
      updatedTemplate.id,
      { 
        templateTask: updatedTemplate.task,
        machineType: updatedTemplate.machineType,
        tasksUpdated: allTemplatesForMachineType.length
      },
      req
    );

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Update maintenance task template error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Template not found' });
    } else {
      res.status(500).json({ error: 'Failed to update template' });
    }
  }
});

// Delete maintenance task template (admin only)
app.delete('/api/maintenance-task-templates/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { id } = req.params;

    // Get the template before deleting it
    const taskTemplate = await prisma.maintenanceTaskTemplate.findUnique({
      where: { id }
    });

    if (!taskTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete all maintenance tasks linked to this template
    const deletedTasks = await prisma.maintenanceTask.deleteMany({
      where: { taskTemplateId: id }
    });

    console.log(`Deleted ${deletedTasks.count} maintenance tasks linked to template ${id}`)

    // Delete the template
    await prisma.maintenanceTaskTemplate.delete({
      where: { id }
    });

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'DELETE_MAINTENANCE_TASK_TEMPLATE',
      'MaintenanceTaskTemplate',
      taskTemplate.id,
      { 
        task: taskTemplate.task,
        machineType: taskTemplate.machineType,
        tasksDeleted: deletedTasks.count
      },
      req
    );

    res.json({ 
      message: 'Maintenance task template deleted successfully',
      tasksDeleted: deletedTasks.count
    });
  } catch (error) {
    console.error('Delete maintenance task template error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance task template not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete maintenance task template' });
    }
  }
});

// Apply task templates to a machine (admin only)
app.post('/api/machines/:machineId/apply-task-templates', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { machineId } = req.params;

    // Get the machine and its type
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        site: {
          select: { name: true }
        }
      }
    });

    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    // Get task templates for this machine type
    const taskTemplates = await prisma.maintenanceTaskTemplate.findMany({
      where: {
        machineType: machine.machineType
      }
    });

    if (taskTemplates.length === 0) {
      return res.status(404).json({ error: 'No task templates found for this machine type' });
    }

    // Check if tasks already exist for this machine
    const existingTasks = await prisma.maintenanceTask.findMany({
      where: { machineId }
    });

    if (existingTasks.length > 0) {
      return res.status(400).json({ error: 'Tasks already exist for this machine. Delete existing tasks first.' });
    }

    // Create maintenance tasks from templates
    const createdTasks = [];
    for (const template of taskTemplates) {
      const task = await prisma.maintenanceTask.create({
        data: {
          task: template.task,
          priority: template.priority,
          frequency: template.frequency,
          machineId: machineId,
          taskTemplateId: template.id,
          completed: false
        },
        include: {
          machine: {
            include: {
              site: {
                select: { name: true }
              }
            }
          }
        }
      });
      createdTasks.push(task);
    }

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'APPLY_TASK_TEMPLATES',
      'Machine',
      machine.id,
      { 
        machineName: machine.name, 
        siteName: machine.site.name,
        machineType: machine.machineType,
        tasksApplied: createdTasks.length
      },
      req
    );

    res.status(201).json({
      message: `Applied ${createdTasks.length} task templates to machine`,
      tasks: createdTasks
    });
  } catch (error) {
    console.error('Apply task templates error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to apply task templates' });
    }
  }
});

// Synchronize all machines of a specific machine type with their templates (admin only)
app.post('/api/synchronize-machine-type/:machineType', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use simple token verification without session check
    const decoded = await authService.verifyTokenWithoutSession(token);
    req.user = decoded.user;

    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { machineType } = req.params;

    // Get all current templates for this machine type
    const allTemplatesForMachineType = await prisma.maintenanceTaskTemplate.findMany({
      where: { machineType }
    });

    // Get all machines of this machine type
    const machinesOfType = await prisma.machine.findMany({
      where: { machineType }
    });

    console.log(`Synchronizing ${machinesOfType.length} machines of type ${machineType}`)
    console.log(`Found ${allTemplatesForMachineType.length} templates for machine type ${machineType}`)

    let totalTasksRemoved = 0
    let totalTasksAdded = 0
    let totalTasksUpdated = 0

    // For each machine of this type, synchronize its maintenance tasks
    for (const machine of machinesOfType) {
      console.log(`Synchronizing tasks for machine: ${machine.name}`)
      
      // Get current tasks for this machine
      const currentTasks = await prisma.maintenanceTask.findMany({
        where: { machineId: machine.id }
      });

      console.log(`Machine ${machine.name} has ${currentTasks.length} current tasks`)

      // Create a set of current task descriptions for easy lookup
      const currentTaskDescriptions = new Set(currentTasks.map(t => t.task))
      
      // Create a set of template task descriptions
      const templateTaskDescriptions = new Set(allTemplatesForMachineType.map(t => t.task))

      // Find tasks that should be removed (exist in current tasks but not in templates)
      const tasksToRemove = currentTasks.filter(task => !templateTaskDescriptions.has(task.task))
      
      // Find tasks that should be added (exist in templates but not in current tasks)
      const tasksToAdd = allTemplatesForMachineType.filter(template => !currentTaskDescriptions.has(template.task))

      console.log(`Tasks to remove: ${tasksToRemove.length}`)
      console.log(`Tasks to add: ${tasksToAdd.length}`)

      // Remove tasks that are no longer in templates
      if (tasksToRemove.length > 0) {
        const deletedTasks = await prisma.maintenanceTask.deleteMany({
          where: {
            id: { in: tasksToRemove.map(t => t.id) }
          }
        });
        console.log(`Deleted ${deletedTasks.count} tasks from machine ${machine.name}`)
        totalTasksRemoved += deletedTasks.count
      }

      // Add new tasks from templates
      for (const template of tasksToAdd) {
        const newTask = await prisma.maintenanceTask.create({
          data: {
            task: template.task,
            priority: template.priority,
            frequency: template.frequency,
            machineId: machine.id,
            taskTemplateId: template.id,
            completed: false
          }
        });
        console.log(`Added task "${template.task}" to machine ${machine.name}`)
        totalTasksAdded++
      }

      // Update existing tasks to match their templates
      const tasksToUpdate = currentTasks.filter(task => 
        task.taskTemplateId && templateTaskDescriptions.has(task.task)
      )

      for (const task of tasksToUpdate) {
        const template = allTemplatesForMachineType.find(t => t.id === task.taskTemplateId)
        if (template) {
          await prisma.maintenanceTask.update({
            where: { id: task.id },
            data: {
              task: template.task,
              priority: template.priority,
              frequency: template.frequency
            }
          });
          console.log(`Updated task "${task.task}" for machine ${machine.name}`)
          totalTasksUpdated++
        }
      }
    }

    // Record audit log
    await authService.recordAuditLog(
      req.user.id,
      'SYNCHRONIZE_MACHINE_TYPE',
      'MaintenanceTask',
      null,
      { 
        machineType,
        machinesSynchronized: machinesOfType.length,
        tasksRemoved: totalTasksRemoved,
        tasksAdded: totalTasksAdded,
        tasksUpdated: totalTasksUpdated
      },
      req
    );

    res.json({
      message: `Synchronized ${machinesOfType.length} machines of type ${machineType}`,
      machinesSynchronized: machinesOfType.length,
      tasksRemoved: totalTasksRemoved,
      tasksAdded: totalTasksAdded,
      tasksUpdated: totalTasksUpdated
    });
  } catch (error) {
    console.error('Synchronize machine type error:', error);
    if (error.message === 'Invalid token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to synchronize machine type' });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Auth API running' });
});

// Test endpoint for debugging
app.post('/api/test', (req, res) => {
  console.log('=== TEST ENDPOINT ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', req.body ? Object.keys(req.body) : 'no body');
  res.json({ 
    received: req.body,
    message: 'Test endpoint working',
    bodyType: typeof req.body,
    bodyKeys: req.body ? Object.keys(req.body) : 'no body'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Auth API server running on port ${PORT}`);
}); 