const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();

// Enhanced Middleware
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// File-based database with backup
const DB_PATH = path.join(__dirname, 'database.json');
const BACKUP_PATH = path.join(__dirname, 'backup');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH);
}

// Initialize database with sample data
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          _id: 'admin_' + Date.now(),
          fullName: 'Admin User',
          email: 'admin@ecoloop.com',
          password: bcrypt.hashSync('admin123', 10),
          role: 'admin',
          location: 'Mumbai',
          phone: '+91 9876543210',
          avatar: '👨‍💼',
          points: 1000,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          stats: {
            totalPickups: 0,
            totalRecycled: 0,
            carbonSaved: 0
          }
        },
        {
          _id: 'volunteer_' + Date.now(),
          fullName: 'Rahul Sharma',
          email: 'volunteer@ecoloop.com',
          password: bcrypt.hashSync('volunteer123', 10),
          role: 'volunteer',
          location: 'Delhi',
          phone: '+91 9876543211',
          avatar: '🦸',
          points: 500,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          stats: {
            totalPickups: 15,
            totalRecycled: 250,
            carbonSaved: 120
          }
        }
      ],
      pickups: [
        {
          _id: 'pickup_' + Date.now(),
          user: 'admin_' + Date.now(),
          wasteType: 'plastic',
          pickupAddress: '123 Green Street, Mumbai - 400001',
          preferredDate: new Date(Date.now() + 86400000).toISOString(),
          description: 'Collected plastic bottles from community event',
          quantity: '5 kg',
          status: 'pending',
          assignedVolunteer: null,
          images: [],
          createdAt: new Date().toISOString(),
          completedAt: null,
          rating: null,
          feedback: null
        }
      ],
      statistics: {
        totalUsers: 2,
        totalVolunteers: 1,
        totalPickups: 1,
        completedPickups: 0,
        totalWasteRecycled: 0,
        carbonFootprintSaved: 0,
        activeUsers: 0
      },
      rewards: [
        { name: 'Eco Warrior', points: 100, icon: '🌱', description: 'Complete 10 pickups' },
        { name: 'Recycling Champion', points: 250, icon: '♻️', description: 'Recycle 50kg waste' },
        { name: 'Green Hero', points: 500, icon: '🌟', description: 'Save 100kg CO2' },
        { name: 'Community Leader', points: 1000, icon: '👑', description: 'Refer 20 friends' }
      ],
      notifications: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    console.log('📁 Created new database with sample data');
  }
}

// Read database with error handling
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    // Restore from backup if available
    const backups = fs.readdirSync(BACKUP_PATH);
    if (backups.length > 0) {
      const latestBackup = backups.sort().pop();
      const backupData = fs.readFileSync(path.join(BACKUP_PATH, latestBackup), 'utf8');
      console.log('📦 Restored from backup:', latestBackup);
      return JSON.parse(backupData);
    }
    // Return empty database structure
    return { users: [], pickups: [], statistics: {}, rewards: [], notifications: [] };
  }
}

// Write database with backup
function writeDB(data) {
  try {
    // Create backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_PATH, `backup-${timestamp}.json`);
    
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupFile);
    }
    
    // Keep only last 5 backups
    const backups = fs.readdirSync(BACKUP_PATH).sort();
    while (backups.length > 5) {
      fs.unlinkSync(path.join(BACKUP_PATH, backups.shift()));
    }
    
    // Write new data
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
  }
}

// Generate unique ID
function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Update statistics
function updateStatistics() {
  const db = readDB();
  const users = db.users;
  const pickups = db.pickups;
  
  db.statistics = {
    totalUsers: users.filter(u => u.role === 'user').length,
    totalVolunteers: users.filter(u => u.role === 'volunteer').length,
    totalPickups: pickups.length,
    completedPickups: pickups.filter(p => p.status === 'completed').length,
    totalWasteRecycled: pickups
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0),
    carbonFootprintSaved: pickups
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (parseFloat(p.quantity) || 0) * 2.5, 0),
    activeUsers: users.filter(u => {
      if (!u.lastLogin) return false;
      const lastLogin = new Date(u.lastLogin);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return lastLogin > thirtyDaysAgo;
    }).length
  };
  
  writeDB(db);
}

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'ecoloop_secret_key_2024_production';

// Generate Token with more claims
const generateToken = (userId, role) => {
  return jwt.sign(
    { 
      id: userId,
      role: role,
      type: 'access'
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

// Generate Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      id: userId,
      type: 'refresh'
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

// Enhanced Auth Middleware
const protect = (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Please login to access this resource' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token type' 
      });
    }
    
    const db = readDB();
    const user = db.users.find(u => u._id === decoded.id);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User no longer exists' 
      });
    }

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    req.userId = decoded.id;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
};

// Role authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

// Initialize database on startup
initDB();
updateStatistics();

// ===== PUBLIC ROUTES =====

// Welcome endpoint with API documentation
app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'EcoLoop API',
    version: '1.0.0',
    description: 'Smart Waste Pickup & Recycling Platform API',
    endpoints: {
      test: 'GET /api/test',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/profile',
      refresh: 'POST /api/auth/refresh-token',
      statistics: 'GET /api/statistics',
      rewards: 'GET /api/rewards'
    }
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'EcoLoop API is running smoothly! 🌿', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get public statistics
app.get('/api/statistics', (req, res) => {
  try {
    const db = readDB();
    updateStatistics();
    const updatedDB = readDB();
    
    res.json({
      success: true,
      data: updatedDB.statistics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get rewards
app.get('/api/rewards', (req, res) => {
  try {
    const db = readDB();
    res.json({
      success: true,
      data: db.rewards
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching rewards' });
  }
});

// ===== AUTH ROUTES =====

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('\n📝 Registration request received');
    
    const { fullName, email, password, role, location, phone } = req.body;

    // Enhanced validation
    const errors = [];
    if (!fullName || fullName.trim().length < 2) errors.push('Full name is required (minimum 2 characters)');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required');
    if (!password || password.length < 6) errors.push('Password must be at least 6 characters');
    if (!location || location.trim().length < 2) errors.push('Location is required');
    if (phone && !/^\+?[\d\s-]{10,}$/.test(phone)) errors.push('Invalid phone number format');

    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: errors.join('. ') 
      });
    }

    // Validate role
    const validRoles = ['user', 'volunteer', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    const db = readDB();

    // Check if user already exists
    const existingUser = db.users.find(u => u.email === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'An account with this email already exists. Please login instead.' 
      });
    }

    // Hash password with stronger salt
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with more fields
    const avatars = ['👤', '🌱', '🌿', '🌳', '🌸', '🍀'];
    const newUser = {
      _id: generateId('user_'),
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: userRole,
      location: location.trim(),
      phone: phone || '',
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      points: userRole === 'volunteer' ? 100 : 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      stats: {
        totalPickups: 0,
        totalRecycled: 0,
        carbonSaved: 0,
        rating: 0
      },
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        language: 'en'
      }
    };

    // Add to database
    db.users.push(newUser);
    
    // Add welcome notification
    db.notifications.push({
      _id: generateId('notif_'),
      userId: newUser._id,
      title: 'Welcome to EcoLoop! 🌿',
      message: `Welcome ${newUser.fullName}! Start your eco-friendly journey today.`,
      type: 'welcome',
      read: false,
      createdAt: new Date().toISOString()
    });
    
    writeDB(db);
    updateStatistics();

    console.log('✅ User registered:', newUser.email);

    // Generate tokens
    const accessToken = generateToken(newUser._id, newUser.role);
    const refreshToken = generateRefreshToken(newUser._id);

    // Send response
    const { password: pwd, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to EcoLoop.',
      user: userWithoutPassword,
      tokens: {
        access: accessToken,
        refresh: refreshToken
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Registration failed. Please try again later.' 
    });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('\n🔑 Login request received');

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both email and password' 
      });
    }

    const db = readDB();

    // Find user
    const user = db.users.find(u => u.email === email.toLowerCase().trim());
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'No account found with this email. Please register first.' 
      });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        success: false,
        message: 'Incorrect password. Please try again.' 
      });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    
    // Add login notification
    db.notifications.push({
      _id: generateId('notif_'),
      userId: user._id,
      title: 'New Login',
      message: `You logged in at ${new Date().toLocaleString()}`,
      type: 'login',
      read: false,
      createdAt: new Date().toISOString()
    });
    
    writeDB(db);

    console.log('✅ Login successful:', user.email);

    // Generate tokens
    const accessToken = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Send response
    const { password: pwd, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      user: userWithoutPassword,
      tokens: {
        access: accessToken,
        refresh: refreshToken
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Login failed. Please try again later.' 
    });
  }
});

// POST /api/auth/refresh-token
app.post('/api/auth/refresh-token', (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const db = readDB();
    const user = db.users.find(u => u._id === decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const newAccessToken = generateToken(user._id, user.role);
    
    res.json({
      success: true,
      token: newAccessToken
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// GET /api/auth/profile
app.get('/api/auth/profile', protect, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u._id === req.userId);
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Get user's recent pickups
  const recentPickups = db.pickups
    .filter(p => p.user === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const { password, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    user: userWithoutPassword,
    recentPickups
  });
});

// PUT /api/auth/profile
app.put('/api/auth/profile', protect, (req, res) => {
  try {
    const db = readDB();
    const userIndex = db.users.findIndex(u => u._id === req.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const allowedUpdates = ['fullName', 'location', 'phone', 'avatar'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        db.users[userIndex][field] = req.body[field];
      }
    });

    writeDB(db);
    
    const { password, ...updatedUser } = db.users[userIndex];
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// ===== PICKUP ROUTES =====

// POST /api/pickups - Create pickup request
app.post('/api/pickups', protect, authorize('user', 'admin'), (req, res) => {
  try {
    const { wasteType, pickupAddress, preferredDate, description, quantity } = req.body;

    const errors = [];
    if (!wasteType) errors.push('Waste type is required');
    if (!pickupAddress || pickupAddress.trim().length < 10) errors.push('Please provide a detailed pickup address');
    if (!preferredDate) errors.push('Preferred date is required');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('. ') });
    }

    // Validate date is in the future
    const pickupDate = new Date(preferredDate);
    if (pickupDate < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please select a future date for pickup' 
      });
    }

    const db = readDB();

    const newPickup = {
      _id: generateId('pickup_'),
      user: req.userId,
      wasteType,
      pickupAddress: pickupAddress.trim(),
      preferredDate: pickupDate.toISOString(),
      description: description || '',
      quantity: quantity || 'Not specified',
      status: 'pending',
      assignedVolunteer: null,
      images: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      rating: null,
      feedback: null,
      trackingNumber: 'ECO' + Date.now().toString().slice(-8)
    };

    db.pickups.push(newPickup);
    
    // Add notification for volunteers
    db.notifications.push({
      _id: generateId('notif_'),
      title: 'New Pickup Request',
      message: `New ${wasteType} waste pickup requested at ${pickupAddress}`,
      type: 'new_pickup',
      forRoles: ['volunteer', 'admin'],
      read: false,
      createdAt: new Date().toISOString()
    });
    
    writeDB(db);
    updateStatistics();

    console.log('✅ Pickup created:', newPickup.trackingNumber);

    res.status(201).json({
      success: true,
      message: 'Pickup request created successfully!',
      pickup: newPickup
    });

  } catch (error) {
    console.error('❌ Create pickup error:', error);
    res.status(500).json({ success: false, message: 'Error creating pickup request' });
  }
});

// GET /api/pickups - Get pickups with filtering and pagination
app.get('/api/pickups', protect, (req, res) => {
  try {
    const db = readDB();
    const { status, wasteType, page = 1, limit = 10 } = req.query;
    let pickups;

    // Filter based on role
    if (req.user.role === 'admin') {
      pickups = db.pickups;
    } else if (req.user.role === 'volunteer') {
      pickups = db.pickups.filter(p => 
        p.status === 'pending' || p.assignedVolunteer === req.userId
      );
    } else {
      pickups = db.pickups.filter(p => p.user === req.userId);
    }

    // Apply filters
    if (status) {
      pickups = pickups.filter(p => p.status === status);
    }
    if (wasteType) {
      pickups = pickups.filter(p => p.wasteType === wasteType);
    }

    // Sort by newest first
    pickups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const total = pickups.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPickups = pickups.slice(startIndex, endIndex);

    // Enrich with user data
    const enrichedPickups = paginatedPickups.map(pickup => {
      const user = db.users.find(u => u._id === pickup.user);
      const volunteer = pickup.assignedVolunteer ? 
        db.users.find(u => u._id === pickup.assignedVolunteer) : null;
      
      return {
        ...pickup,
        user: user ? {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          avatar: user.avatar,
          location: user.location
        } : null,
        assignedVolunteer: volunteer ? {
          _id: volunteer._id,
          fullName: volunteer.fullName,
          email: volunteer.email,
          avatar: volunteer.avatar
        } : null
      };
    });

    res.json({
      success: true,
      data: enrichedPickups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get pickups error:', error);
    res.status(500).json({ success: false, message: 'Error fetching pickups' });
  }
});

// GET /api/pickups/:id - Get single pickup
app.get('/api/pickups/:id', protect, (req, res) => {
  try {
    const db = readDB();
    const pickup = db.pickups.find(p => p._id === req.params.id);

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found' });
    }

    // Check access
    if (req.user.role === 'user' && pickup.user !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = db.users.find(u => u._id === pickup.user);
    const volunteer = pickup.assignedVolunteer ? 
      db.users.find(u => u._id === pickup.assignedVolunteer) : null;

    res.json({
      success: true,
      pickup: {
        ...pickup,
        user: user ? {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          location: user.location
        } : null,
        assignedVolunteer: volunteer ? {
          _id: volunteer._id,
          fullName: volunteer.fullName,
          email: volunteer.email,
          phone: volunteer.phone
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pickup' });
  }
});

// PUT /api/pickups/:id/status - Update pickup status
app.put('/api/pickups/:id/status', protect, authorize('volunteer', 'admin'), (req, res) => {
  try {
    const { status, notes } = req.body;
    const pickupId = req.params.id;

    const validStatuses = ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const db = readDB();
    const pickupIndex = db.pickups.findIndex(p => p._id === pickupId);

    if (pickupIndex === -1) {
      return res.status(404).json({ success: false, message: 'Pickup not found' });
    }

    const pickup = db.pickups[pickupIndex];

    // Update status
    const oldStatus = pickup.status;
    pickup.status = status;
    
    if (req.user.role === 'volunteer' && status === 'accepted') {
      pickup.assignedVolunteer = req.userId;
    }

    if (status === 'completed') {
      pickup.completedAt = new Date().toISOString();
      
      // Update user stats
      const userIndex = db.users.findIndex(u => u._id === pickup.user);
      if (userIndex !== -1) {
        db.users[userIndex].stats.totalPickups++;
        db.users[userIndex].stats.totalRecycled += parseFloat(pickup.quantity) || 0;
        db.users[userIndex].stats.carbonSaved += (parseFloat(pickup.quantity) || 0) * 2.5;
        db.users[userIndex].points += 10;
      }

      // Update volunteer stats
      if (pickup.assignedVolunteer) {
        const volunteerIndex = db.users.findIndex(u => u._id === pickup.assignedVolunteer);
        if (volunteerIndex !== -1) {
          db.users[volunteerIndex].stats.totalPickups++;
          db.users[volunteerIndex].points += 20;
        }
      }
    }

    // Add status change notification
    const pickupUser = db.users.find(u => u._id === pickup.user);
    if (pickupUser) {
      db.notifications.push({
        _id: generateId('notif_'),
        userId: pickup.user,
        title: 'Pickup Status Updated',
        message: `Your pickup #${pickup.trackingNumber} is now ${status}`,
        type: 'status_update',
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    writeDB(db);
    updateStatistics();

    console.log(`✅ Pickup ${pickup.trackingNumber} status: ${oldStatus} → ${status}`);

    res.json({
      success: true,
      message: `Pickup status updated to ${status}`,
      pickup: db.pickups[pickupIndex]
    });

  } catch (error) {
    console.error('❌ Update pickup error:', error);
    res.status(500).json({ success: false, message: 'Error updating pickup' });
  }
});

// ===== ADMIN ROUTES =====

// GET /api/admin/users
app.get('/api/admin/users', protect, authorize('admin'), (req, res) => {
  try {
    const db = readDB();
    const users = db.users.map(({ password, ...user }) => ({
      ...user,
      totalPickups: db.pickups.filter(p => p.user === user._id).length
    }));
    
    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// GET /api/admin/dashboard - Admin dashboard data
app.get('/api/admin/dashboard', protect, authorize('admin'), (req, res) => {
  try {
    updateStatistics();
    const db = readDB();
    
    const recentPickups = db.pickups
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);
    
    const recentUsers = db.users
      .filter(u => u.role === 'user')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({
      success: true,
      statistics: db.statistics,
      recentPickups,
      recentUsers,
      pickupStatusCounts: {
        pending: db.pickups.filter(p => p.status === 'pending').length,
        accepted: db.pickups.filter(p => p.status === 'accepted').length,
        inProgress: db.pickups.filter(p => p.status === 'in-progress').length,
        completed: db.pickups.filter(p => p.status === 'completed').length,
        cancelled: db.pickups.filter(p => p.status === 'cancelled').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
  }
});

// ===== NOTIFICATIONS ROUTES =====

// GET /api/notifications
app.get('/api/notifications', protect, (req, res) => {
  try {
    const db = readDB();
    let notifications = db.notifications.filter(n => 
      n.userId === req.userId || 
      (n.forRoles && n.forRoles.includes(req.user.role))
    );

    // Sort by newest first
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: notifications,
      unread: notifications.filter(n => !n.read).length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// PUT /api/notifications/:id/read
app.put('/api/notifications/:id/read', protect, (req, res) => {
  try {
    const db = readDB();
    const notifIndex = db.notifications.findIndex(n => n._id === req.params.id);

    if (notifIndex !== -1) {
      db.notifications[notifIndex].read = true;
      writeDB(db);
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating notification' });
  }
});

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(60));
  console.log('  🌿  EcoLoop - Smart Waste Pickup & Recycling Platform');
  console.log('═'.repeat(60));
  console.log(`  ✅ Server running on: http://localhost:${PORT}`);
  console.log(`  📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`  💾 Database: File-based JSON storage`);
  console.log(`  🔐 Auth: JWT with refresh tokens`);
  console.log('═'.repeat(60));
  console.log('  Demo Accounts:');
  console.log('  📧 Admin: admin@ecoloop.com | Pass: admin123');
  console.log('  📧 Volunteer: volunteer@ecoloop.com | Pass: volunteer123');
  console.log('═'.repeat(60) + '\n');
});