// backend/models/Photo.js
const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Photo title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  s3Key: {
    type: String,
    required: [true, 'S3 key is required'],
    select: false // Don't return S3 key by default for security
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    max: [10000, 'Price cannot exceed $10,000']
  },
  category: {
    type: String,
    enum: ['nature', 'portrait', 'landscape', 'abstract', 'street', 'wildlife', 'architecture', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required']
  },
  sellerName: {
    type: String,
    required: [true, 'Seller name is required']
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  buyerName: {
    type: String,
    default: null
  },
  sold: {
    type: Boolean,
    default: false,
    index: true
  },
  soldDate: {
    type: Date,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  reportCount: {
    type: Number,
    default: 0
  },
  reports: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    width: Number,
    height: Number,
    fileSize: Number,
    format: String,
    camera: String,
    lens: String,
    iso: Number,
    aperture: String,
    shutterSpeed: String,
    focalLength: String,
    dateTaken: Date
  },
  originalFileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: 'image/jpeg'
  },
  paymentInfo: {
    paymentId: String,
    paymentMethod: String,
    transactionDate: Date,
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  uploadDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
photoSchema.index({ sellerId: 1, sold: 1 });
photoSchema.index({ buyerId: 1 });
photoSchema.index({ price: 1 });
photoSchema.index({ category: 1 });
photoSchema.index({ tags: 1 });
photoSchema.index({ uploadDate: -1 });
photoSchema.index({ soldDate: -1 });
photoSchema.index({ likesCount: -1 });
photoSchema.index({ views: -1 });

// Text index for search functionality
photoSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for checking if photo can be deleted
photoSchema.virtual('canDelete').get(function() {
  return !this.sold && this.isActive;
});

// Virtual for checking if photo can be edited
photoSchema.virtual('canEdit').get(function() {
  return !this.sold && this.isActive;
});

// Pre-save middleware
photoSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = Date.now();
  
  // Update likes count
  if (this.likes) {
    this.likesCount = this.likes.length;
  }
  
  next();
});

// Method to mark as sold
photoSchema.methods.markAsSold = async function(buyerId, buyerName, paymentInfo = {}) {
  this.sold = true;
  this.buyerId = buyerId;
  this.buyerName = buyerName;
  this.soldDate = new Date();
  
  if (paymentInfo) {
    this.paymentInfo = {
      ...paymentInfo,
      transactionDate: new Date()
    };
  }
  
  return await this.save();
};

// Method to increment views
photoSchema.methods.incrementViews = async function() {
  this.views += 1;
  return await this.save();
};

// Method to toggle like
photoSchema.methods.toggleLike = async function(userId) {
  const index = this.likes.indexOf(userId);
  
  if (index === -1) {
    this.likes.push(userId);
  } else {
    this.likes.splice(index, 1);
  }
  
  this.likesCount = this.likes.length;
  return await this.save();
};

// Method to add report
photoSchema.methods.addReport = async function(userId, reason) {
  this.reports.push({ userId, reason });
  this.reportCount = this.reports.length;
  
  // Auto-deactivate if too many reports
  if (this.reportCount >= 5) {
    this.isActive = false;
  }
  
  return await this.save();
};

// Static method to find featured photos
photoSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ featured: true, isActive: true, sold: false })
    .sort('-uploadDate')
    .limit(limit);
};

// Static method to find by category
photoSchema.statics.findByCategory = function(category, options = {}) {
  const query = { category, isActive: true };
  if (!options.includeSold) {
    query.sold = false;
  }
  
  return this.find(query).sort('-uploadDate');
};

// Static method for search
photoSchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    isActive: true
  };
  
  if (!options.includeSold) {
    query.sold = false;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

// Remove sensitive data when converting to JSON
photoSchema.methods.toJSON = function() {
  const photo = this.toObject();
  delete photo.__v;
  return photo;
};

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;
