// frontend/pages/admin/login.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, Shield } from 'lucide-react';
import styles from '../../styles/Admin.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function AdminLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      verifyAndRedirect(adminToken);
    }
  }, []);

  const verifyAndRedirect = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        router.push('/admin');
      } else {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, check if this is an admin account
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid admin credentials');
      }

      const data = await response.json();

      // Verify admin privileges
      if (!data.user.isAdmin) {
        throw new Error('This account does not have admin privileges');
      }

      // Store credentials
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));

      if (rememberMe) {
        // Store in a more persistent way
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        localStorage.setItem('adminTokenExpiry', expirationDate.toISOString());
      }

      // Redirect to admin dashboard
      router.push('/admin');

    } catch (error) {
      console.error('Admin login error:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
      
      // Clear form on error
      setFormData({ ...formData, password: '' });
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
    <>
      <Head>
        <title>Admin Login - Photo Marketplace</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className={styles.adminContainer}>
        <div className={styles.loginWrapper}>
          <div className={styles.loginCard}>
            {/* Logo/Header */}
            <div className={styles.loginHeader}>
              <div className={styles.adminIconWrapper}>
                <Shield className={styles.adminIcon} size={32} />
              </div>
              <h1 className={styles.loginTitle}>Admin Portal</h1>
              <p className={styles.loginSubtitle}>
                Restricted Access - Authorized Personnel Only
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className={styles.errorAlert}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className={styles.loginForm}>
              {/* Email Field */}
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>
                  Admin Email
                </label>
                <div className={styles.inputWrapper}>
                  <Mail className={styles.inputIcon} size={20} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="admin@photomarketplace.com"
                    required
                    disabled={loading}
                    className={styles.formInput}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.formLabel}>
                  Password
                </label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter admin password"
                    required
                    disabled={loading}
                    className={styles.formInput}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className={styles.rememberMe}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="rememberMe" className={styles.checkboxLabel}>
                  Keep me signed in for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !formData.email || !formData.password}
                className={styles.submitButton}
              >
                {loading ? (
                  <>
                    <Loader2 className={styles.spinner} size={20} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Lock size={20} />
                    <span>Sign In to Admin Panel</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className={styles.loginFooter}>
              <p className={styles.securityNote}>
                🔒 All admin activities are logged and monitored
              </p>
              <div className={styles.footerLinks}>
                <a href="/" className={styles.footerLink}>
                  ← Back to Marketplace
                </a>
                <span className={styles.divider}>|</span>
                <a 
                  href="mailto:support@photomarketplace.com" 
                  className={styles.footerLink}
                >
                  Need Help?
                </a>
              </div>
            </div>
          </div>

          {/* Additional Security Info */}
          <div className={styles.securityInfo}>
            <h3>Security Notice</h3>
            <ul>
              <li>This is a restricted area for administrators only</li>
              <li>Unauthorized access attempts will be logged</li>
              <li>Your IP address and login attempts are being monitored</li>
              <li>For security issues, contact: security@photomarketplace.com</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Inline styles for this specific page */}
      <style jsx>{`
        .${styles.loginWrapper} {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }

        .${styles.securityInfo} {
          margin-top: 20px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          max-width: 420px;
          color: white;
        }

        .${styles.securityInfo} h3 {
          margin-bottom: 10px;
          font-size: 16px;
        }

        .${styles.securityInfo} ul {
          list-style: none;
          padding: 0;
          font-size: 13px;
          opacity: 0.9;
        }

        .${styles.securityInfo} li {
          padding: 4px 0;
        }

        .${styles.rememberMe} {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .${styles.checkbox} {
          width: 18px;
          height: 18px;
          accent-color: #667eea;
        }

        .${styles.checkboxLabel} {
          font-size: 14px;
          color: #666;
          cursor: pointer;
        }

        .${styles.divider} {
          color: #ccc;
          margin: 0 10px;
        }
      `}</style>
    </>
  );
}
