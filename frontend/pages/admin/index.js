// frontend/pages/admin/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminDashboard from '../../components/admin/AdminDashboard';
import AdminLogin from '../../components/admin/AdminLogin';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      // Verify token with backend
      verifyAdminToken(adminToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyAdminToken = async (token) => {
    try {
      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? (
    <AdminDashboard />
  ) : (
    <AdminLogin onLogin={() => setIsAuthenticated(true)} />
  );
}
