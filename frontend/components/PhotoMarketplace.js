// frontend/components/PhotoMarketplace.js
import React, { useState, useEffect } from 'react';
import { Camera, Upload, User, ShoppingCart, Eye, DollarSign, X, Edit2, Save, LogOut, Loader2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
console.log('API_BASE_URL:', API_BASE_URL); // Add this line temporarily

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

  // Purchase photo
  // Replace the purchasePhoto function with this:
const redirectToPayment = (photo) => {
  console.log('redirectToPayment called with photo:', photo);
  
  if (photo.sellerId === currentUser?.id) {
    console.log('Cannot buy own photo');
    return;
  }
  
  const currentUrl = window.location.href;
  console.log('Current URL:', currentUrl);
  
  const paymentUrl = `https://amunik-app-2025.s3.amazonaws.com/payment.html?` + 
    new URLSearchParams({
      id: photo.id || photo._id,
      title: photo.title,
      seller: photo.sellerName,
      price: photo.price,
      image: photo.imageUrl,
      returnUrl: currentUrl
    });
  
  console.log('Payment URL:', paymentUrl);
  
  // Test if the URL opens
  window.open(paymentUrl, '_blank');
};

// Update the PhotoCard component buy button:
// In the PhotoCard component, find this button:
{showActions && !photo.sold && !isOwner && (
  <button
    onClick={() => purchasePhoto(photo)}
    className="mt-3 w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center space-x-2"
  >
    <ShoppingCart className="h-4 w-4" />
    <span>Buy Now</span>
  </button>
)}

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
          
          {showActions && !photo.sold && !isOwner && (
            <button
              onClick={() => purchasePhoto(photo)}
              className="mt-3 w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center space-x-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Buy Now</span>
            </button>
          )}
          
          {photo.sold && photo.buyerName && (
            <div className="mt-3 text-sm text-gray-500">
              Sold to: {photo.buyerName}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Photo Modal
  const PhotoModal = ({ photo, onClose }) => {
    if (!photo) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl max-h-full overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{photo.title}</h2>
                <p className="text-gray-600">by {photo.sellerName}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full max-h-96 object-contain rounded-lg"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="font-bold text-green-600 text-xl">${photo.price}</span>
                </div>
                {photo.sold && (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    Sold
                  </span>
                )}
              </div>
              
              {!photo.sold && (photo.sellerId !== currentUser?.id) && (
                <button
                  onClick={() => purchasePhoto(photo)}
                  className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center space-x-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Buy Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showLogin) {
    return <AuthForm />;
  }

  const filteredPhotos = getFilteredPhotos();
  const isSeller = currentUser?.userType === 'seller';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Camera className="h-8 w-8 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900">Photo Marketplace</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{currentUser.name}</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                  {currentUser.userType}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors duration-200"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Browse Photos</span>
              </div>
            </button>
            
            {isSeller && (
              <button
                onClick={() => setActiveTab('myGallery')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'myGallery'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Camera className="h-4 w-4" />
                  <span>My Gallery</span>
                </div>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('purchased')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'purchased'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4" />
                <span>Purchased</span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {activeTab === 'myGallery' && isSeller && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Photos</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Drag and drop your photos here, or click to select</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e.target.files)}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition duration-200 cursor-pointer inline-flex items-center space-x-2"
              >
                {uploading ? (
                  <React.Fragment>
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>Uploading...</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <Upload className="h-4 w-4" />
                    <span>Select Photos</span>
                  </React.Fragment>
                )}
              </label>
              <p className="text-sm text-gray-500 mt-2">
                Images will be stored securely in AWS S3
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
            <span className="ml-2 text-gray-600">Loading photos...</span>
          </div>
        )}

        {/* Photos Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPhotos.map((photo) => (
              <PhotoCard
                key={photo.id || photo._id}
                photo={photo}
                showPrice={true}
                showActions={true}
                isOwner={(photo.sellerId === currentUser?.id)}
              />
            ))}
          </div>
        )}

        {!loading && filteredPhotos.length === 0 && (
          <div className="text-center py-12">
            <Camera className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {activeTab === 'browse' && 'No photos available for purchase'}
              {activeTab === 'myGallery' && 'Your gallery is empty'}
              {activeTab === 'purchased' && 'No purchases yet'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'browse' && 'Check back later for new photos!'}
              {activeTab === 'myGallery' && 'Upload your first photo to get started'}
              {activeTab === 'purchased' && 'Browse photos to make your first purchase'}
            </p>
          </div>
        )}
      </main>

      {/* Photo Modal */}
      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};

export default PhotoMarketplace;
