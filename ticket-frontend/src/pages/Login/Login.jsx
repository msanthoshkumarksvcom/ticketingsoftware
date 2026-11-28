import React, { useState } from 'react';
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
  // Server error state for the badge
  const [serverError, setServerError] = useState('');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Change Password modal states
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify' | 'success'
  const [forgotEmail, setForgotEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [simulatedCode, setSimulatedCode] = useState(null);
  const [codeSentMessage, setCodeSentMessage] = useState('');

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

  const handleOpenForgotModal = () => {
    setForgotStep('request');
    setForgotEmail(email || '');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setForgotError('');
    setForgotSuccess('');
    setSimulatedCode(null);
    setCodeSentMessage('');
    setIsForgotModalOpen(true);
  };

  const handleCloseForgotModal = () => {
    if (forgotLoading) return;
    setIsForgotModalOpen(false);
  };

  // Step 1: Send Verification Code to Email
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    setCodeSentMessage('');
    setSimulatedCode(null);

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
      const res = await axios.post('http://localhost:5000/api/forgot-password/send-code', {
        email: cleanEmail
      });
      setCodeSentMessage(res.data.message || `Verification code sent to ${cleanEmail}`);
      if (res.data.simulatedCode) {
        setSimulatedCode(res.data.simulatedCode);
        setVerificationCode(res.data.simulatedCode);
      }
      setForgotStep('verify');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to send verification code. Please check your email and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify Code and Change Password in the same screen
  const handleVerifyAndChangePassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanEmail = (forgotEmail || '').trim();
    const cleanCode = (verificationCode || '').trim();

    if (!cleanCode) {
      setForgotError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (cleanCode.length !== 6) {
      setForgotError('Verification code must be exactly 6 digits.');
      return;
    }
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
      const res = await axios.post('http://localhost:5000/api/forgot-password/verify', {
        email: cleanEmail,
        code: cleanCode,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setForgotSuccess(res.data.message || 'Password changed successfully!');
      setForgotStep('success');
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to update password. Please check the code and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Finish and return to login screen
  const handleFinishAndSignIn = () => {
    setEmail(forgotEmail);
    setPassword(''); // Cleared so user enters their new password
    setIsForgotModalOpen(false);
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
      {/* ──────────────────────────────────────────────────────────────────
          Left Panel: 100vh Immersive Glassmorphism Hero Showcase
          ────────────────────────────────────────────────────────────────── */}
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
              <span>Systems Operational • 99.9% Uptime</span>
            </div>
            <span className="hero-copy-text">© 2026 QA Software Enterprise</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          Right Panel: 100vh Full-Height Clean Form Surface
          ────────────────────────────────────────────────────────────────── */}
      <div className="login-form-pane">
        <div className="login-form-inner">
          {/* Mobile-only brand header */}
          <div className="mobile-brand-banner">
            <div className="mobile-cube-box">
              <CubeLogo />
            </div>
            <span className="mobile-brand-name">QA Software</span>
          </div>

          {/* Form Header */}
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
                onClick={handleOpenForgotModal}
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
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="forgot-modal-backdrop" onClick={handleCloseForgotModal}>
          <div className="forgot-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="forgot-modal-header">
              <div className="forgot-header-content">
                <div 
                  className="forgot-icon-wrap"
                  style={forgotStep === 'success' ? { background: '#f0fdf4', color: '#16a34a' } : undefined}
                >
                  {forgotStep === 'success' ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <KeyRound size={22} />
                  )}
                </div>
                <div>
                  <h3 className="forgot-modal-title">
                    {forgotStep === 'request' && 'Reset Password'}
                    {forgotStep === 'verify' && 'Enter Code & New Password'}
                    {forgotStep === 'success' && 'Password Changed!'}
                  </h3>
                  <p className="forgot-modal-subtitle">
                    {forgotStep === 'request' && 'Enter your registered email to receive a verification code.'}
                    {forgotStep === 'verify' && 'Enter the 6-digit code sent to your email and set your new password.'}
                    {forgotStep === 'success' && 'Your password has been updated. You can now sign in.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="forgot-modal-close"
                onClick={handleCloseForgotModal}
                disabled={forgotLoading}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* STEP 1: Request Verification Code */}
            {forgotStep === 'request' && (
              <form onSubmit={handleSendCode}>
                <div className="forgot-modal-body">
                  {forgotError && (
                    <div className="forgot-alert-error">
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Registered Email Address</label>
                    <div className="input-container">
                      <Mail className="input-icon" />
                      <input
                        type="email"
                        className="input-field"
                        placeholder="e.g. member@qasoftware.com"
                        maxLength={150}
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (forgotError) setForgotError('');
                        }}
                        disabled={forgotLoading}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <div className="forgot-modal-footer">
                  <button
                    type="button"
                    className="forgot-btn-cancel"
                    onClick={handleCloseForgotModal}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="forgot-btn-submit"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <span style={{ display: 'inline-block', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', width: '14px', height: '14px', animation: 'spin 1s linear infinite' }}></span>
                        Sending Code...
                      </>
                    ) : (
                      <>Send Verification Code</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Verify Code and Set New Password in same screen */}
            {forgotStep === 'verify' && (
              <form onSubmit={handleVerifyAndChangePassword}>
                <div className="forgot-modal-body">
                  {forgotError && (
                    <div className="forgot-alert-error">
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {/* Email sent notification badge */}
                  <div className="code-sent-badge">
                    <span>Code sent to: <strong>{forgotEmail}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('request');
                        setForgotError('');
                      }}
                      disabled={forgotLoading}
                    >
                      Change Email
                    </button>
                  </div>

                  {/* Fallback simulation notice if SMTP not configured */}
                  {simulatedCode && (
                    <div className="simulated-code-callout">
                      <span>Dev Mode Code: <strong style={{ letterSpacing: '1px' }}>{simulatedCode}</strong></span>
                      <span style={{ fontSize: '0.75rem', color: '#166534' }}>(Auto-filled)</span>
                    </div>
                  )}

                  {/* Verification Code */}
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">6-Digit Verification Code</label>
                    <div className="input-container">
                      <KeyRound className="input-icon" />
                      <input
                        type="text"
                        maxLength={6}
                        className="input-field"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => {
                          setVerificationCode(e.target.value.replace(/\D/g, ''));
                          if (forgotError) setForgotError('');
                        }}
                        disabled={forgotLoading}
                        style={{ letterSpacing: '2px', fontWeight: 600, fontFamily: 'monospace' }}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">New Password</label>
                    <div className="input-container">
                      <Lock className="input-icon" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="input-field"
                        placeholder="Min 8 chars: upper, lower, number & special char"
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

                  {/* Confirm New Password */}
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">Confirm New Password</label>
                    <div className="input-container">
                      <Lock className="input-icon" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="input-field"
                        placeholder="Re-enter your new password"
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

                  {/* Resend Link */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={forgotLoading}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 0'
                      }}
                    >
                      Didn't get code? Resend
                    </button>
                  </div>
                </div>

                <div className="forgot-modal-footer">
                  <button
                    type="button"
                    className="forgot-btn-cancel"
                    onClick={handleCloseForgotModal}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="forgot-btn-submit"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <span style={{ display: 'inline-block', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', width: '14px', height: '14px', animation: 'spin 1s linear infinite' }}></span>
                        Updating...
                      </>
                    ) : (
                      <>Change Password</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Confirmation */}
            {forgotStep === 'success' && (
              <div>
                <div className="forgot-modal-body" style={{ textAlign: 'center', paddingTop: '10px' }}>
                  <div className="forgot-alert-success" style={{ textAlign: 'left', marginBottom: '20px' }}>
                    <div className="forgot-alert-success-header">
                      <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                      <span>Password Changed Successfully</span>
                    </div>
                    <p className="forgot-alert-success-text">
                      {forgotSuccess || 'Your password has been successfully updated.'}
                    </p>
                  </div>

                  <p style={{ margin: '0 0 8px 0', fontSize: '0.92rem', color: '#0f172a', fontWeight: 600 }}>
                    Account: {forgotEmail}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                    Click below to return to the sign-in screen and log in with your newly set password.
                  </p>
                </div>

                <div className="forgot-modal-footer">
                  <button
                    type="button"
                    className="forgot-btn-submit"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleFinishAndSignIn}
                  >
                    Proceed to Sign In &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}

export default Login;
