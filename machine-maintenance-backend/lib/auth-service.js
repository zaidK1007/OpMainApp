const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

class AuthService {
  // Generate JWT token
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        sessionId: user.sessionId // Include session ID for tracking
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  // Verify JWT token and check if session is still active
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if session is still active in database
      const session = await prisma.userSession.findFirst({
        where: {
          token: token,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: true
        }
      });

      if (!session) {
        throw new Error('Session expired or invalid');
      }

      return {
        ...decoded,
        user: session.user
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Simple token verification without session check (for admin operations)
  async verifyTokenWithoutSession(token) {
    try {
      console.log('Verifying token without session check...');
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('JWT decoded successfully:', { id: decoded.id, email: decoded.email, role: decoded.role });
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      console.log('User found in database:', user ? { id: user.id, email: user.email, role: user.role, isActive: user.isActive } : 'Not found');

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return {
        ...decoded,
        user: user
      };
    } catch (error) {
      console.error('Token verification error:', error.message);
      throw new Error('Invalid token');
    }
  }

  // Create user session in database
  async createSession(userId, token, req) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    return await prisma.userSession.create({
      data: {
        userId,
        token,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        expiresAt
      }
    });
  }

  // Invalidate session (logout)
  async invalidateSession(token) {
    return await prisma.userSession.updateMany({
      where: { token },
      data: { isActive: false }
    });
  }

  // Record login attempt
  async recordLoginAttempt(userId, success, req) {
    return await prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        success
      }
    });
  }

  // Record audit log
  async recordAuditLog(userId, action, resource = null, resourceId = null, details = null, req) {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details: details ? JSON.stringify(details) : null,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      }
    });
  }

  // Login user with full database integration
  async login(email, password, req) {
    try {
      // Find user
      const user = await prisma.user.findUnique({ 
        where: { email },
        include: {
          sessions: {
            where: { isActive: true }
          }
        }
      });

      if (!user) {
        await this.recordLoginAttempt(null, false, req);
        throw new Error('Invalid credentials');
      }

      if (!user.isActive) {
        await this.recordLoginAttempt(user.id, false, req);
        throw new Error('Account is deactivated');
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        await this.recordLoginAttempt(user.id, false, req);
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = this.generateToken(user);

      // Create session in database
      const session = await this.createSession(user.id, token, req);

      // Update user's last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Record successful login
      await this.recordLoginAttempt(user.id, true, req);
      await this.recordAuditLog(user.id, 'LOGIN', 'User', user.id, { method: 'email' }, req);

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        sessionId: session.id
      };
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  async logout(token, req) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Invalidate session
      await this.invalidateSession(token);
      
      // Record logout
      await this.recordAuditLog(decoded.id, 'LOGOUT', 'User', decoded.id, null, req);
      
      return { success: true };
    } catch (error) {
      throw new Error('Logout failed');
    }
  }

  // Register new user (with audit trail)
  async register(userData, adminUser = null, req) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new Error('Email already in use');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        }
      });

      // Record audit log
      const auditDetails = {
        createdBy: adminUser ? adminUser.id : 'SYSTEM_SETUP',
        userRole: userData.role
      };
      
      await this.recordAuditLog(
        adminUser ? adminUser.id : null,
        'CREATE_USER',
        'User',
        user.id,
        auditDetails,
        req
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user sessions
  async getUserSessions(userId) {
    return await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Get user login history
  async getUserLoginHistory(userId, limit = 10) {
    return await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // Get audit logs
  async getAuditLogs(filters = {}) {
    const where = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    
    return await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50
    });
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    return await prisma.userSession.updateMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        isActive: true
      },
      data: {
        isActive: false
      }
    });
  }
}

module.exports = new AuthService(); 