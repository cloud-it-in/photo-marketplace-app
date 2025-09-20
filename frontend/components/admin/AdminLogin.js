// frontend/components/admin/AdminLogin.js
import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const AdminLogin = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default admin credentials (change in production!)
  const ADMIN_CREDENTIALS = {
    email: 'admin@photomarketplace.com',
    password: 'admin123'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate admin credentials
      if (formData.email !== ADMIN_CREDENTIALS.email || 
          formData.password !== ADMIN_CREDENTIALS.password) {
        throw new Error('Invalid admin credentials');
      }

      // Login using the existing backend endpoint
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      // Store admin token and user data
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      
      // Call parent component's onLogin callback
      onLogin(data.user, data.token);
      
    } catch (error) {
      console.error('Admin login error:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-icon">
            <Lock className="admin-lock-icon" />
          </div>
          <h1>Admin Access</h1>
          <p>Sign in to access the admin dashboard</p>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="admin@photomarketplace.com"
                required
                disabled={loading}
                className="admin-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter admin password"
                required
                disabled={loading}
                className="admin-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.email || !formData.password}
            className="admin-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="spinner" size={18} />
                Authenticating...
              </>
            ) : (
              'Sign In as Admin'
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <p className="security-note">
            🔒 This is a secure admin area. All actions are logged.
          </p>
          <a href="/" className="back-link">
            ← Back to Marketplace
          </a>
        </div>
      </div>

      <style jsx>{`
        .admin-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .admin-login-card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .admin-login-header {
          text-align: center;
          margin-bottom: 35px;
        }

        .admin-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .admin-lock-icon {
          color: white;
          width: 28px;
          height: 28px;
        }

        .admin-login-header h1 {
          color: #333;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .admin-login-header p {
          color: #666;
          font-size: 14px;
        }

        .error-alert {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          animation: shake 0.3s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .admin-login-form {
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-size: 14px;
          font-weight: 600;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #999;
          pointer-events: none;
        }

        .admin-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .admin-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .admin-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: #667eea;
        }

        .admin-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .admin-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }

        .admin-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .admin-login-footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .security-note {
          color: #999;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .back-link {
          color: #667eea;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #764ba2;
          text-decoration: underline;
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .admin-login-card {
            padding: 30px 20px;
          }

          .admin-login-header h1 {
            font-size: 24px;
          }

          .admin-submit-btn {
            font-size: 14px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;
