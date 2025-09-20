// backend/server.js - Complete backend server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// Import admin routes
const adminRoutes = require('./routes/admin');

// Use admin routes
app.use('/api/admin', adminRoutes);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// In your server.js, add:
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['seller', 'buyer'], required: true },
  createdAt: { type: Date, default: Date.now },
  purchases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
  sales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }]
});

const User = mongoose.model('User', userSchema);

// Photo Schema
const photoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  s3Key: { type: String, required: true },
  price: { type: Number, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerName: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  sold: { type: Boolean, default: false },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyerName: { type: String },
  originalFileName: { type: String }
});

const Photo = mongoose.model('Photo', photoSchema);

// Configure AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, userType } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      userType
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Upload photo
app.post('/api/upload-photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;
    const { title, price } = req.body;
    
    // Get user info
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate unique filename
    const fileExtension = originalname.split('.').pop();
    const fileName = `photos/${user._id}/${uuidv4()}.${fileExtension}`;
    
    // Upload to S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: mimetype
    };

    const result = await s3.upload(uploadParams).promise();
    
    // Create photo record
    const photo = new Photo({
      title: title || originalname.split('.')[0],
      imageUrl: result.Location,
      s3Key: fileName,
      price: parseFloat(price) || 0,
      sellerId: user._id,
      sellerName: user.name,
      originalFileName: originalname
    });

    await photo.save();

    // Update user's sales array
    user.sales.push(photo._id);
    await user.save();

    res.json({
      id: photo._id,
      title: photo.title,
      imageUrl: photo.imageUrl,
      s3Key: photo.s3Key,
      price: photo.price,
      sellerId: photo.sellerId,
      sellerName: photo.sellerName,
      uploadDate: photo.uploadDate,
      sold: photo.sold,
      originalFileName: photo.originalFileName
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get all photos
app.get('/api/photos', async (req, res) => {
  try {
    const photos = await Photo.find().populate('sellerId', 'name');
    res.json(photos);
  } catch (error) {
    console.error('Fetch photos error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Get user's photos
app.get('/api/my-photos', authenticateToken, async (req, res) => {
  try {
    const photos = await Photo.find({ sellerId: req.user.userId });
    res.json(photos);
  } catch (error) {
    console.error('Fetch user photos error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Get purchased photos
app.get('/api/purchased', authenticateToken, async (req, res) => {
  try {
    const photos = await Photo.find({ buyerId: req.user.userId });
    res.json(photos);
  } catch (error) {
    console.error('Fetch purchased photos error:', error);
    res.status(500).json({ error: 'Failed to fetch purchased photos' });
  }
});

// Purchase photo
app.post('/api/purchase/:photoId', authenticateToken, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photo.sold) {
      return res.status(400).json({ error: 'Photo already sold' });
    }

    if (photo.sellerId.toString() === req.user.userId) {
      return res.status(400).json({ error: 'Cannot purchase your own photo' });
    }

    const buyer = await User.findById(req.user.userId);
    if (!buyer) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update photo
    photo.sold = true;
    photo.buyerId = buyer._id;
    photo.buyerName = buyer.name;
    await photo.save();

    // Update buyer's purchases
    buyer.purchases.push(photo._id);
    await buyer.save();

    res.json({ message: 'Photo purchased successfully', photo });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// Update photo price
app.patch('/api/photos/:photoId/price', authenticateToken, async (req, res) => {
  try {
    const { price } = req.body;
    const photo = await Photo.findOne({ 
      _id: req.params.photoId, 
      sellerId: req.user.userId 
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found or unauthorized' });
    }

    if (photo.sold) {
      return res.status(400).json({ error: 'Cannot update price of sold photo' });
    }

    photo.price = parseFloat(price) || 0;
    await photo.save();

    res.json(photo);
  } catch (error) {
    console.error('Price update error:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Delete photo
app.delete('/api/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const photo = await Photo.findOne({ 
      _id: req.params.photoId, 
      sellerId: req.user.userId 
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found or unauthorized' });
    }

    if (photo.sold) {
      return res.status(400).json({ error: 'Cannot delete sold photo' });
    }

    // Delete from S3
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: photo.s3Key
    };

    await s3.deleteObject(deleteParams).promise();

    // Delete from database
    await Photo.findByIdAndDelete(photo._id);

    // Remove from user's sales array
    await User.findByIdAndUpdate(
      req.user.userId,
      { $pull: { sales: photo._id } }
    );

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Process completed payment
app.post('/api/complete-purchase', authenticateToken, async (req, res) => {
  try {
    const { photoId, paymentId, paymentMethod } = req.body;
    
    const photo = await Photo.findById(photoId);
    if (!photo || photo.sold) {
      return res.status(400).json({ error: 'Photo not available' });
    }

    // Update photo as sold
    photo.sold = true;
    photo.buyerId = req.user.userId;
    photo.buyerName = req.user.name;
    photo.paymentId = paymentId;
    photo.paymentMethod = paymentMethod;
    photo.soldDate = new Date();
    await photo.save();

    // Update buyer's purchases
    await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { purchases: photo._id } }
    );

    res.json({ message: 'Purchase completed successfully', photo });
  } catch (error) {
    console.error('Purchase completion error:', error);
    res.status(500).json({ error: 'Purchase completion failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
