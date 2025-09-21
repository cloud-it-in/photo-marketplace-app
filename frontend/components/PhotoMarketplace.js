//Missing components-Co-Pilot
import React, { useState } from 'react';
import {
  DollarSign,
  Save,
  X,
  Edit2,
  ShoppingCart,
  Trash2
} from 'react-feather';

// frontend/components/PhotoMarketplace.js
import React, { useState, useEffect } from 'react';
import { Camera, Upload, User, ShoppingCart, Eye, DollarSign, X, Edit2, Save, LogOut, Loader2, Trash2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const PhotoMarketplace = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [showLogin, setShowLogin] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
      setShowLogin(false);
      fetchPhotos(savedToken);
    }
  }, []);

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  };

  // Fetch all photos
  const fetchPhotos = async (authToken = token) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/photos`);
      const photosData = await response.json();
      setPhotos(photosData);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  // User authentication
  const handleAuth = async (userData, isLogin = false) => {
    try {
      setLoading(true);
      const endpoint = isLogin ? '/login' : '/register';
      const response = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      setCurrentUser(response.user);
      setToken(response.token);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setShowLogin(false);
      fetchPhotos(response.token);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLogin(true);
    setActiveTab('browse');
    setSelectedPhoto(null);
    setPhotos([]);
  };

  // Photo upload
  const handlePhotoUpload = async (files) => {
    try {
      setUploading(true);
      const uploadedPhotos = [];

      for (let file of Array.from(files)) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('title', file.name.split('.')[0]);
        formData.append('price', '10');

        const response = await fetch(`${API_BASE_URL}/upload-photo`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const photoData = await response.json();
        uploadedPhotos.push(photoData);
      }

      setPhotos([...photos, ...uploadedPhotos]);
      setActiveTab('myGallery');
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Redirect to payment page
  const redirectToPayment = (photo) => {
    if (photo.sellerId === currentUser?.id) {
      return;
    }
    
    const currentUrl = window.location.href;
    
    const paymentUrl = `https://amunik-app-2025.s3.amazonaws.com/payment.html?` + 
      new URLSearchParams({
        id: photo.id || photo._id,
        title: photo.title,
        seller: photo.sellerName,
        price: photo.price,
        image: photo.imageUrl,
        returnUrl: currentUrl
      });
    
    window.open(paymentUrl, '_blank');
  };

  // Update photo price
  const updatePhotoPrice = async (photoId, newPrice) => {
    try {
      await apiCall(`/photos/${photoId}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ price: parseFloat(newPrice) || 0 }),
      });

      setPhotos(photos.map(photo =>
        (photo.id === photoId || photo._id === photoId)
          ? { ...photo, price: parseFloat(newPrice) || 0 }
          : photo
      ));
    } catch (error) {
      alert('Price update failed: ' + error.message);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photo) => {
    if (!confirm(`Are you sure you want to delete "${photo.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const photoId = photo.id || photo._id;
      
      const response = await fetch(`${API_BASE_URL}/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      // Remove photo from local state
      setPhotos(photos.filter(p => (p.id || p._id) !== photoId));
      
      alert('Photo deleted successfully');
    } catch (error) {
      alert('Delete failed: ' + error.message);
    }
  };
  
  // Filter photos based on current view
  const getFilteredPhotos = () => {
    const userId = currentUser?.id;
    switch (activeTab) {
      case 'browse':
        return photos.filter(p => !p.sold && p.sellerId !== userId);
      case 'myGallery':
        return photos.filter(p => p.sellerId === userId);
      case 'purchased':
        return photos.filter(p => p.buyerId === userId);
      default:
        return [];
    }
  };

  // Login/Registration Component
  const AuthForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      userType: 'seller'
    });

    const handleSubmit = () => {
      if (isRegister && (!formData.name || !formData.email || !formData.password)) {
        alert('Please fill in all fields');
        return;
      }
      if (!isRegister && (!formData.email || !formData.password)) {
        alert('Please fill in all fields');
        return;
      }

      handleAuth(formData, !isRegister);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Camera className="mx-auto h-12 w-12 text-purple-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Photo Marketplace</h1>
            <p className="text-gray-600 mt-2">
              {isRegister ? 'Join our creative community' : 'Welcome back!'}
            </p>
          </div>
          
          <div className="space-y-6">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>
            
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Account Type
                </label>
                <div className="space-y-3">
                  <div className="flex items-center cursor-pointer" onClick={() => setFormData({...formData, userType: 'seller'})}>
                    <input
                      type="radio"
                      name="userType"
                      value="seller"
                      checked={formData.userType === 'seller'}
                      onChange={(e) => setFormData({...formData, userType: e.target.value})}
                      className="h-4 w-4 text-purple-600"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      <strong>Seller</strong> - Upload and sell photos
                    </span>
                  </div>
                  <div className="flex items-center cursor-pointer" onClick={() => setFormData({...formData, userType: 'buyer'})}>
                    <input
                      type="radio"
                      name="userType"
                      value="buyer"
                      checked={formData.userType === 'buyer'}
                      onChange={(e) => setFormData({...formData, userType: e.target.value})}
                      className="h-4 w-4 text-purple-600"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      <strong>Buyer</strong> - Browse and purchase photos
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-200 font-medium flex items-center justify-center"
            >
              {loading ? (
                <React.Fragment>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {isRegister ? 'Creating Account...' : 'Signing In...'}
                </React.Fragment>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>

            <div className="text-center">
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-purple-600 hover:text-purple-700 text-sm"
              >
                {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Photo Card Component
  const PhotoCard = ({ photo, showPrice = true, showActions = true, isOwner = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editPrice, setEditPrice] = useState(photo.price);

    const handlePriceSave = () => {
      updatePhotoPrice(photo.id || photo._id, editPrice);
      setIsEditing(false);
    };

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105">
        <div className="aspect-square bg-gray-100 relative">
          <img
            src={photo.imageUrl}
            alt={photo.title}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setSelectedPhoto(photo)}
          />
          {photo.sold && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">
                SOLD
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate">{photo.title}</h3>
          <p className="text-sm text-gray-500">by {photo.sellerName}</p>
          
          {showPrice && (
            <div className="mt-2 flex items-center justify-between">
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={handlePriceSave}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditPrice(photo.price);
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-bold text-green-600">${photo.price}</span>
                  {isOwner && !photo.sold && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-2 p-1 text-gray-500 hover:text-purple-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {showActions && (
            <div className="mt-4 flex space-x-2">
              {!isOwner && !photo.sold && (
                <button
                  onClick={() => redirectToPayment(photo)}
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Buy
                </button>
              )}
              {isOwner && !photo.sold && (
                <button
                  onClick={() => handleDeletePhoto(photo)}
                  className="flex items-center px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow">
        <div className="flex items-center space-x-3">
          <Camera className="h-8 w-8 text-purple-600" />
          <span className="text-2xl font-bold text-gray-900">Photo Marketplace</span>
        </div>
        {currentUser && (
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 flex items-center">
              <User className="h-5 w-5 mr-1" />
              {currentUser.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 transition"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto py-8 px-4">
        {showLogin ? (
          <AuthForm />
        ) : (
          <React.Fragment>
            {/* Tabs */}
            <div className="flex space-x-4 mb-8">
              <button
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'browse'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-600 border border-purple-200'
                }`}
                onClick={() => setActiveTab('browse')}
              >
                <Eye className="h-5 w-5 mr-2" />
                Browse
              </button>
              <button
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'myGallery'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-600 border border-purple-200'
                }`}
                onClick={() => setActiveTab('myGallery')}
              >
                <Upload className="h-5 w-5 mr-2" />
                My Gallery
              </button>
              <button
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'purchased'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-600 border border-purple-200'
                }`}
                onClick={() => setActiveTab('purchased')}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Purchased
              </button>
            </div>

            {/* Upload Button */}
            {activeTab === 'myGallery' && (
              <div className="mb-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <span className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                  />
                </label>
              </div>
            )}

            {/* Photo Grid */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {getFilteredPhotos().length === 0 ? (
                  <div className="col-span-full text-center text-gray-500">
                    No photos found.
                  </div>
                ) : (
                  getFilteredPhotos().map((photo) => (
                    <PhotoCard
                      key={photo.id || photo._id}
                      photo={photo}
                      showPrice={true}
                      showActions={activeTab !== 'purchased'}
                      isOwner={photo.sellerId === currentUser?.id}
                    />
                  ))
                )}
              </div>
            )}
          </React.Fragment>
        )}
      </main>
    </div>
  );
};

export default PhotoMarketplace;
