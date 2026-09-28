import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as loginApi, getProfile, logout as logoutApi } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Verify token is still valid and check permissions
          const profileResponse = await getProfile();
          if (profileResponse.data) {
            // Update user with fresh data
            const freshUser = profileResponse.data;
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
            
            // Check if user has web access
            if (!freshUser.has_web_access) {
              console.warn('User does not have web access, logging out...');
              await logout();
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', email);
      const response = await loginApi(email, password);
      const { token, user: userData } = response.data;
      
      console.log('Login successful:', userData);
      
      // Check if user has web access
      if (!userData.has_web_access) {
        return { 
          success: false, 
          error: 'This account does not have web access. Please use the mobile app.' 
        };
      }
      
      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error.response?.data);
      
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password.';
      } else if (error.response?.status === 403) {
        errorMessage = error.response?.data?.message || 'Account is deactivated or access denied.';
      } else if (error.response?.status === 419) {
        errorMessage = 'Session expired. Please refresh the page and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please check your network.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Cannot connect to the server. Please make sure the API is running.';
      }
      
      return { 
        success: false, 
        error: errorMessage,
        status: error.response?.status
      };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await logoutApi();
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local storage regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    return roles.includes(user.role);
  };

  const isAdmin = () => user?.role === 'admin';
  const isStaff = () => user?.role === 'staff';
  const isEnforcer = () => user?.role === 'enforcer';
  const hasWebAccess = () => user?.has_web_access === true;
  const hasMobileAccess = () => user?.has_mobile_access === true;

  const refreshUser = async () => {
    try {
      const response = await getProfile();
      const freshUser = response.data;
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
      return freshUser;
    } catch (error) {
      console.error('Refresh user error:', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    hasRole,
    isAdmin,
    isStaff,
    isEnforcer,
    hasWebAccess,
    hasMobileAccess,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;