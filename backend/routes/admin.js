// backend/routes/admin.js - NEW FILE
const express = require('express');
const router = express.Router();
const Photo = require('../models/Photo');
const User = require('../models/User');

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
