// backend/routes/admin.js - NEW FILE
const express = require('express');
const router = express.Router();
const Photo = require('../models/Photo');
const User = require('../models/User');

// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Admin login endpoint
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({ error: 'Account is locked. Please try again later.' });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      await user.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        isAdmin: true 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin,
        lastLogin: user.lastLogin
      },
      token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify admin token
router.get('/admin/verify', authenticateAdmin, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;

// Admin middleware to check admin privileges
const isAdmin = (req, res, next) => {
    // Check if user is admin (add 'isAdmin' field to User schema)
    if (req.user && req.user.email === 'admin@photomarketplace.com') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Get all users (admin only)
router.get('/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Delete multiple photos (admin only)
router.delete('/admin/photos/bulk', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { photoIds } = req.body;
        
        // Delete from S3 first
        for (const photoId of photoIds) {
            const photo = await Photo.findById(photoId);
            if (photo && photo.s3Key) {
                await s3.deleteObject({
                    Bucket: BUCKET_NAME,
                    Key: photo.s3Key
                }).promise();
            }
        }
        
        // Delete from database
        await Photo.deleteMany({ _id: { $in: photoIds } });
        
        res.json({ message: 'Photos deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete photos' });
    }
});

// Get dashboard statistics (admin only)
router.get('/admin/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const totalPhotos = await Photo.countDocuments();
        const soldPhotos = await Photo.countDocuments({ sold: true });
        const totalUsers = await User.countDocuments();
        const totalRevenue = await Photo.aggregate([
            { $match: { sold: true } },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);
        
        res.json({
            totalPhotos,
            soldPhotos,
            totalUsers,
            totalRevenue: totalRevenue[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
