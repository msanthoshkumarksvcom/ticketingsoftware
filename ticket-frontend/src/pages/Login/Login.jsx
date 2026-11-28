import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { applyTheme } from '../../utils/theme';
import './Login.css';

const CubeLogo = () => (
  <svg width="120" height="120" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="translate(50, 50)">
      {/* Top face (White) */}
      <path d="M 0 -40 L 34 -20 L 0 0 L -34 -20 Z" fill="#ffffff" />
      {/* Top face light blue highlight */}
      <path d="M -34 -20 L -10 -6 L -17 -30 Z" fill="#e0f2fe" />
      {/* Left face (Vibrant Blue) */}
      <path d="M -34 -20 L 0 0 L 0 40 L -34 20 Z" fill="#2563eb" />
      {/* Right face (Dark Navy) */}
      <path d="M 0 0 L 34 -20 L 34 20 L 0 40 Z" fill="#1e293b" />
    </g>
  </svg>
);

import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getValidToken } from '../../utils/auth';
import { getRoleHomeRoute } from '../../utils/roleRoutes';
import { validateStrongPassword } from '../../utils/inputValidation';
export { getRoleHomeRoute };

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Specific error states for fields
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // Server error / success state for login
  const [serverError, setServerError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Inline sliding forgot-password flow: 'login' | 'reset-otp' | 'set-password'
  const [authView, setAuthView] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  // Check if session expired query param is set, or redirect if already logged in with valid token
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sessionExpired')) {
      setServerError('Your session has expired. Please sign in again.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const token = getValidToken();
    const role = localStorage.getItem('userRole');
    if (token && role) {
      navigate(getRoleHomeRoute(role), { replace: true });
    }
  }, [navigate]);

  const handleOpenForgotView = () => {
    setForgotEmail(email || '');
    setOtpSent(false);
    setOtpDigits(['', '', '', '', '', '']);
    setResendSeconds(0);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setForgotError('');
    setLoginNotice('');
    setAuthView('reset-otp');
  };

  const handleBackToLogin = () => {
    if (forgotLoading) return;
    setForgotError('');
    setAuthView('login');
  };

  // Step 1: Send Verification Code to Email
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');

    const cleanEmail = (forgotEmail || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setForgotError('Please enter a valid email format.');
      return;
    }

    setForgotLoading(true);
    try {
      await axios.post('http://localhost:5000/api/forgot-password/send-code', {
        email: cleanEmail
      });
      setOtpDigits(['', '', '', '', '', '']);
      setOtpSent(true);
      setResendSeconds(59);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to send verification code. Please check your email and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOtpChange = (index, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (forgotError) setForgotError('');
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const chars = pasted.split('');
    setOtpDigits([0, 1, 2, 3, 4, 5].map((i) => chars[i] || ''));
    const focusIdx = Math.min(chars.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // Step 2: Verify 6-digit OTP and slide to Set New Password
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotError('');

    const cleanEmail = (forgotEmail || '').trim();
    const cleanCode = otpDigits.join('');

    if (cleanCode.length !== 6) {
      setForgotError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setForgotLoading(true);
    try {
      await axios.post('http://localhost:5000/api/forgot-password/verify-code', {
        email: cleanEmail,
        code: cleanCode
      });
      setAuthView('set-password');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Invalid or expired verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Set New Password and slide back to Login
  const handleResetNewPassword = async (e) => {
    e.preventDefault();
    setForgotError('');

    const cleanEmail = (forgotEmail || '').trim();
    const cleanCode = otpDigits.join('');

    const pwdErr = validateStrongPassword(newPassword, 'New password');
    if (pwdErr) {
      setForgotError(pwdErr);
      return;
    }
    if (!confirmPassword) {
      setForgotError('Please confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('New password and confirm password do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      await axios.post('http://localhost:5000/api/forgot-password/verify', {
        email: cleanEmail,
        code: cleanCode,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setEmail(cleanEmail);
      setPassword('');
      setServerError('');
      setLoginNotice('Password reset successful! Sign in with your new password.');
      setAuthView('login');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to update password. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

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
        localStorage.setItem('userId', response.data.user.id || '');
        localStorage.setItem('userEmail', response.data.user.email || '');
        localStorage.setItem('userName', response.data.user.full_name || '');
        localStorage.setItem('userRole', response.data.user.role || 'QA Member');
        localStorage.setItem('userDepartment', response.data.user.department || '');
        localStorage.setItem('userBio', response.data.user.bio || '');
        if (response.data.user.avatar) {
          localStorage.setItem('userAvatar', response.data.user.avatar);
        } else {
          localStorage.removeItem('userAvatar');
        }
        if (response.data.user.theme) {
          applyTheme(response.data.user.theme);
        }
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
    <div className="login-fullpage-root">
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          Left Panel: 100vh Immersive Glassmorphism Hero Showcase
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="login-hero-pane">
        <div className="hero-mesh-overlay" aria-hidden="true" />
        <div className="hero-orb orb-1" aria-hidden="true" />
        <div className="hero-orb orb-2" aria-hidden="true" />
        <div className="hero-grid-pattern" aria-hidden="true" />

        <div className="hero-content-wrapper">
          {/* Top Brand Pill */}
          <div className="hero-topbar">
            <div className="hero-brand-pill">
              <span className="hero-brand-dot" aria-hidden="true" />
              <span>QA ENTERPRISE CLOUD</span>
            </div>
          </div>

          {/* Center Brand Showcase */}
          <div className="hero-center-body">
            <div className="hero-cube-pedestal">
              <div className="hero-cube-wrap">
                <CubeLogo />
              </div>
            </div>

            <h1 id="login-brand-heading" className="hero-main-title">
              QA <span className="hero-title-accent">Software</span>
            </h1>

            <p className="hero-subtitle">
              Next-generation quality management, continuous test execution matrix, and release workflow automation.
            </p>
          </div>

          {/* Bottom Trust & Status Row */}
          <div className="hero-bottom-bar">
            <div className="hero-status-pill">
              <span className="status-indicator-dot" />
              <span>Systems Operational â€¢ 99.9% Uptime</span>
            </div>
            <span className="hero-copy-text">Â© 2026 QA Software Enterprise</span>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          Right Panel: 100vh Full-Height Clean Form Surface
          â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="login-form-pane">
        <div className="login-form-inner">
          {/* Mobile-only brand header */}
          <div className="mobile-brand-banner">
            <div className="mobile-cube-box">
              <CubeLogo />
            </div>
            <span className="mobile-brand-name">QA Software</span>
          </div>

          <div className="login-slider-viewport">
            <div className={`login-slider-track view-${authView}`}>
              {/* â”€â”€ PANEL 1: Welcome Back (Sign In) â”€â”€ */}
              <div className="login-slider-panel">
                <div className="login-form-header">
                  <div className="login-secure-chip">
                    <ShieldCheck size={13} />
                    <span>SECURE ACCESS PORTAL</span>
                  </div>
                  <h2 id="login-welcome-heading" className="login-welcome-title">
                    Welcome <span className="title-highlight">Back</span>
                  </h2>
                  <p className="login-welcome-desc">
                    Sign in with your enterprise credentials to access your QA dashboard.
                  </p>
                </div>

                {loginNotice && (
                  <div className="login-success-alert" role="status">
                    <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                    <span>{loginNotice}</span>
                  </div>
                )}

                {/* Server Error Alert */}
                {serverError && (
            <div className="login-server-alert" role="alert">
              <AlertCircle size={18} className="alert-svg-icon" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Login Form */}
          <form id="login-form" onSubmit={handleLogin} noValidate autoComplete="off">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className={`input-container ${emailError ? 'error-state' : ''}`}>
                <Mail className="input-icon" aria-hidden="true" />
                <input 
                  id="login-email"
                  type="email" 
                  name="login_email"
                  autoComplete="off"
                  className="input-field" 
                  placeholder="Enter your email" 
                  maxLength={150}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                    if (serverError) setServerError('');
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className={`field-error-msg ${emailError ? 'visible' : ''}`}>
                {emailError || ' '}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className={`input-container ${passwordError ? 'error-state' : ''}`}>
                <Lock className="input-icon" aria-hidden="true" />
                <input 
                  id="login-password"
                  type={showPassword ? "text" : "password"} 
                  name="login_password"
                  autoComplete="new-password"
                  className="input-field" 
                  placeholder="Enter your password" 
                  maxLength={100}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                    if (serverError) setServerError('');
                  }}
                  disabled={isLoading}
                />
                {showPassword ? (
                  <EyeOff
                    id="login-hide-password-btn"
                    className="eye-icon"
                    onClick={() => !isLoading && setShowPassword(false)}
                    aria-label="Hide password"
                    role="button"
                    tabIndex={0}
                  />
                ) : (
                  <Eye
                    id="login-show-password-btn"
                    className="eye-icon"
                    onClick={() => !isLoading && setShowPassword(true)}
                    aria-label="Show password"
                    role="button"
                    tabIndex={0}
                  />
                )}
              </div>
              <div className={`field-error-msg ${passwordError ? 'visible' : ''}`}>
                {passwordError || ' '}
              </div>
            </div>

            <div className="options-container">
              <label className="remember-me-label">
                <input type="checkbox" className="remember-me-checkbox" defaultChecked />
                <span>Remember this device</span>
              </label>
              <button 
                id="login-forgot-password-link"
                type="button" 
                className="forgot-password" 
                onClick={handleOpenForgotView}
              >
                Forgot Password?
              </button>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="sign-in-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="sign-in-icon" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
              </div>

              {/* â”€â”€ PANEL 2: Reset Password (Email + 6-Box OTP) â”€â”€ */}
              <div className="login-slider-panel">
                <div className="login-form-header">
                  <div className="login-secure-chip">
                    <ShieldCheck size={13} />
                    <span>SECURE ACCESS PORTAL</span>
                  </div>
                  <h2 id="reset-password-heading" className="login-welcome-title">
                    Reset Password
                  </h2>
                  <p className="login-welcome-desc">
                    Enter your email to verify identity.
                  </p>
                </div>

                {forgotError && authView === 'reset-otp' && (
                  <div className="login-server-alert" role="alert">
                    <AlertCircle size={18} className="alert-svg-icon" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form id="reset-otp-form" onSubmit={otpSent ? handleVerifyOtp : handleSendCode} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reset-email-input">Email Address</label>
                    <div className="input-container">
                      <Mail className="input-icon" aria-hidden="true" />
                      <input
                        id="reset-email-input"
                        type="email"
                        className="input-field"
                        placeholder="user@example.com"
                        maxLength={150}
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (forgotError) setForgotError('');
                        }}
                        disabled={forgotLoading || otpSent}
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div className="form-group" style={{ marginTop: '4px' }}>
                      <div className="otp-header-row">
                        <label className="form-label" style={{ marginBottom: 0 }}>Verification Code</label>
                        <span className="otp-code-tag">OTP Code</span>
                      </div>
                      <p className="otp-helper-sub">An OTP has been sent to your email</p>

                      <div className="otp-boxes-row" onPaste={handleOtpPaste}>
                        {[0, 1, 2].map((idx) => (
                          <input
                            key={idx}
                            id={`reset-otp-box-${idx}`}
                            ref={(el) => { otpRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className="otp-digit-box"
                            value={otpDigits[idx]}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            disabled={forgotLoading}
                            aria-label={`OTP digit ${idx + 1}`}
                          />
                        ))}
                        <span className="otp-dash-sep" aria-hidden="true">-</span>
                        {[3, 4, 5].map((idx) => (
                          <input
                            key={idx}
                            id={`reset-otp-box-${idx}`}
                            ref={(el) => { otpRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className="otp-digit-box"
                            value={otpDigits[idx]}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            disabled={forgotLoading}
                            aria-label={`OTP digit ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    id={otpSent ? 'verify-otp-btn' : 'send-otp-btn'}
                    type="submit"
                    className="sign-in-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <span className="btn-spinner" aria-hidden="true" />
                        <span>{otpSent ? 'Verifying...' : 'Sending OTP...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{otpSent ? 'Verify OTP' : 'Send OTP'}</span>
                        <ArrowRight className="sign-in-icon" aria-hidden="true" />
                      </>
                    )}
                  </button>

                  <div className="reset-footer-links">
                    {otpSent && (
                      resendSeconds > 0 ? (
                        <span className="resend-timer-text">Resend OTP in {resendSeconds}s</span>
                      ) : (
                        <button
                          id="resend-otp-btn"
                          type="button"
                          className="resend-link-btn"
                          onClick={handleSendCode}
                          disabled={forgotLoading}
                        >
                          Resend OTP
                        </button>
                      )
                    )}
                    <button
                      id="reset-back-to-login-btn"
                      type="button"
                      className="back-to-login-btn"
                      onClick={handleBackToLogin}
                      disabled={forgotLoading}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </div>

              {/* â”€â”€ PANEL 3: Set New Password â”€â”€ */}
              <div className="login-slider-panel">
                <div className="login-form-header">
                  <div className="login-secure-chip">
                    <ShieldCheck size={13} />
                    <span>SECURE ACCESS PORTAL</span>
                  </div>
                  <h2 id="set-password-heading" className="login-welcome-title">
                    Set New Password
                  </h2>
                  <p className="login-welcome-desc">
                    Create a secure password for your account.
                  </p>
                </div>

                {forgotError && authView === 'set-password' && (
                  <div className="login-server-alert" role="alert">
                    <AlertCircle size={18} className="alert-svg-icon" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form id="set-new-password-form" onSubmit={handleResetNewPassword} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="set-new-password-input">New Password</label>
                    <div className="input-container">
                      <Lock className="input-icon" aria-hidden="true" />
                      <input
                        id="set-new-password-input"
                        type={showNewPassword ? 'text' : 'password'}
                        className="input-field"
                        placeholder="Enter new password"
                        maxLength={128}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (forgotError) setForgotError('');
                        }}
                        disabled={forgotLoading}
                      />
                      {showNewPassword ? (
                        <EyeOff className="eye-icon" onClick={() => setShowNewPassword(false)} />
                      ) : (
                        <Eye className="eye-icon" onClick={() => setShowNewPassword(true)} />
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="set-confirm-password-input">Confirm Password</label>
                    <div className="input-container">
                      <Lock className="input-icon" aria-hidden="true" />
                      <input
                        id="set-confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="input-field"
                        placeholder="Re-enter new password"
                        maxLength={128}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (forgotError) setForgotError('');
                        }}
                        disabled={forgotLoading}
                      />
                      {showConfirmPassword ? (
                        <EyeOff className="eye-icon" onClick={() => setShowConfirmPassword(false)} />
                      ) : (
                        <Eye className="eye-icon" onClick={() => setShowConfirmPassword(true)} />
                      )}
                    </div>
                  </div>

                  <ul className="pwd-checklist" aria-label="Password requirements">
                    <li className={`pwd-check-item ${newPassword.length >= 8 ? 'met' : ''}`}>
                      <Check size={15} className="pwd-check-icon" />
                      <span>At least 8 characters</span>
                    </li>
                    <li className={`pwd-check-item ${/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'met' : ''}`}>
                      <Check size={15} className="pwd-check-icon" />
                      <span>One uppercase &amp; one lowercase letter</span>
                    </li>
                    <li className={`pwd-check-item ${/[0-9]/.test(newPassword) ? 'met' : ''}`}>
                      <Check size={15} className="pwd-check-icon" />
                      <span>One number</span>
                    </li>
                    <li className={`pwd-check-item ${/[^A-Za-z0-9]/.test(newPassword) ? 'met' : ''}`}>
                      <Check size={15} className="pwd-check-icon" />
                      <span>One special character</span>
                    </li>
                  </ul>

                  <button
                    id="reset-password-submit-btn"
                    type="submit"
                    className="sign-in-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <span className="btn-spinner" aria-hidden="true" />
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>

                  <div className="reset-footer-links">
                    <button
                      id="set-pwd-back-to-login-btn"
                      type="button"
                      className="back-to-login-btn"
                      onClick={handleBackToLogin}
                      disabled={forgotLoading}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
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
