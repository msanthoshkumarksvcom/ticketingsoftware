import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import './Login.css';

const CubeLogo = () => (
  <svg width="140" height="140" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(50, 50)">
      {/* Top face (White) */}
      <path d="M 0 -40 L 34 -20 L 0 0 L -34 -20 Z" fill="#ffffff" />
      {/* Top face light blue highlight */}
      <path d="M -34 -20 L -10 -6 L -17 -30 Z" fill="#d1f0ff" />
      {/* Left face (Vibrant Blue) */}
      <path d="M -34 -20 L 0 0 L 0 40 L -34 20 Z" fill="#296df2" />
      {/* Right face (Dark Navy) */}
      <path d="M 0 0 L 34 -20 L 34 20 L 0 40 Z" fill="#1b2a59" />
    </g>
  </svg>
);

import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Helper to route each role to its dedicated dashboard
export const getRoleHomeRoute = (role) => {
  switch (role) {
    case 'Developer':
      return '/developer';
    case 'Project Lead':
      return '/project-lead';
    case 'QA Member':
      return '/qa-member';
    case 'Manager':
    case 'QA Lead':
    default:
      return '/admin';
  }
};

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Specific error states for fields
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // Server error state for the badge
  const [serverError, setServerError] = useState('');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in and redirect to their specific dashboard
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    if (token) {
      navigate(getRoleHomeRoute(role), { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setServerError('');
    
    let isValid = true;

    // 1. Email Format Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Please enter your email address.');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email format.');
      isValid = false;
    }
    
    // 2. Password Check
    if (!password) {
      setPasswordError('Please enter your password.');
      isValid = false;
    }

    if (!isValid) return;

    // --- Validation Passed, Start Loading ---
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password
      });

      // Clear the form fields completely
      setEmail('');
      setPassword('');

      localStorage.setItem('token', response.data.token);
      if (response.data.user) {
        localStorage.setItem('userEmail', response.data.user.email || '');
        localStorage.setItem('userName', response.data.user.full_name || '');
        localStorage.setItem('userRole', response.data.user.role || 'QA Member');
        localStorage.setItem('userDepartment', response.data.user.department || '');
      }

      const userRole = response.data.user?.role;
      navigate(getRoleHomeRoute(userRole), { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-panel">
        <div className="bg-circle-1"></div>
        <div className="bg-circle-2"></div>
        <div className="bg-circle-3"></div>
        
        <div className="logo-container">
          <div className="logo-icon-wrapper">
            <CubeLogo />
          </div>
          <h1 className="logo-text">
            <span>QA</span> Software
          </h1>
          <p className="logo-subtitle">Project | Testing | Tickets | Team Management</p>
          <div className="logo-divider"></div>
        </div>
      </div>

      <div className="right-panel">
        <div className="form-wrapper">
          <h2 className="welcome-text">
            Welcome <span>Back</span>
          </h2>
          <p className="subtitle">Sign in to your QA Software account</p>

          {/* Single Server Error Badge */}
          {serverError && (
            <div style={{ 
              backgroundColor: '#fff1f2', 
              color: '#ef4444', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '20px', 
              fontSize: '0.95rem', 
              fontWeight: '500', 
              display: 'flex', 
              alignItems: 'center', 
              border: '1px solid #fecdd3'
            }}>
              <span style={{ marginRight: '10px', fontSize: '1.2rem' }}>⚠️</span>
              {serverError}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate autoComplete="off">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className={`input-container ${emailError ? 'error-state' : ''}`} style={{ border: emailError ? '1px solid #ef4444' : '', borderRadius: '8px', transition: 'all 0.2s' }}>
                <Mail className="input-icon" style={{ color: emailError ? '#ef4444' : '#64748b', transition: 'all 0.2s' }} />
                <input 
                  type="email" 
                  name="login_email"
                  autoComplete="off"
                  className="input-field" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                    if (serverError) setServerError('');
                  }}
                  disabled={isLoading}
                  style={{ borderColor: 'transparent' }}
                />
              </div>
              {/* Permanent reserved space to prevent layout jump */}
              <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', fontWeight: '500', minHeight: '16px', opacity: emailError ? 1 : 0, transition: 'opacity 0.2s' }}>
                {emailError || ' '}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '5px' }}>
              <label className="form-label">Password</label>
              <div className={`input-container ${passwordError ? 'error-state' : ''}`} style={{ border: passwordError ? '1px solid #ef4444' : '', borderRadius: '8px', transition: 'all 0.2s' }}>
                <Lock className="input-icon" style={{ color: passwordError ? '#ef4444' : '#64748b', transition: 'all 0.2s' }} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="login_password"
                  autoComplete="new-password"
                  className="input-field" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                    if (serverError) setServerError('');
                  }}
                  disabled={isLoading}
                  style={{ borderColor: 'transparent' }}
                />
                {showPassword ? (
                  <EyeOff className="eye-icon" onClick={() => !isLoading && setShowPassword(false)} />
                ) : (
                  <Eye className="eye-icon" onClick={() => !isLoading && setShowPassword(true)} />
                )}
              </div>
              {/* Permanent reserved space to prevent layout jump */}
              <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', fontWeight: '500', minHeight: '16px', opacity: passwordError ? 1 : 0, transition: 'opacity 0.2s' }}>
                {passwordError || ' '}
              </div>
            </div>

            <div className="options-container" style={{ justifyContent: 'flex-end' }}>
              <a href="#" className="forgot-password">Forgot Password?</a>
            </div>

            <button type="submit" className="sign-in-btn" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
              {isLoading ? (
                <>
                  <span style={{ display: 'inline-block', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite', marginRight: '8px' }}></span>
                  Signing in...
                </>
              ) : (
                <>Sign In <ArrowRight className="sign-in-icon" /></>
              )}
            </button>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}

export default Login;
