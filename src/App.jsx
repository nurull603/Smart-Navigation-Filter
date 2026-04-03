import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import MapView from './MapView';
import MapView3D from './MapView3D';
import logo from './assets/logo.png';
import './App.css';

// ============================================================
// FIREBASE ERROR MESSAGES
// ============================================================
function firebaseErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try logging in.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/user-not-found': return 'No account found with this email. Please create one.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential': return 'Incorrect email or password. Please try again.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}

// ============================================================
// DISABILITY SELECTOR
// ============================================================
function DisabilitySelector({ disabilities, onChange }) {
  const handleChange = (key) => {
    if (key === 'none') {
      onChange({ wheelchair: false, visuallyImpaired: false, hearingImpaired: false, anxiety: false, none: true });
    } else {
      onChange({ ...disabilities, [key]: !disabilities[key], none: false });
    }
  };
  const items = [
    { key: 'wheelchair', icon: '♿', label: 'Wheelchair User' },
    { key: 'visuallyImpaired', icon: '👁️', label: ' Visually Impaired' },
    { key: 'hearingImpaired', icon: '🦻', label: ' Hearing Impaired' },
    { key: 'anxiety', icon: '💙', label: ' Anxiety / Sensory Sensitivity' },
    { key: 'EMT', icon: '✓', label: ' Care Provider' },
  ];
  return (
    <div className="checkbox-group">
      {items.map(item => (
        <label key={item.key} className={`checkbox-item ${disabilities[item.key] ? 'checked' : ''}`}>
          <input type="checkbox" checked={disabilities[item.key]} onChange={() => handleChange(item.key)} />
          <span className="checkbox-icon">{item.icon}</span>
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

// ============================================================
// WELCOME PAGE
// ============================================================
function WelcomePage({ onNavigate }) {
  return (
    <div className="page welcome-page">
      <div className="welcome-content">
        <img src={logo} alt="Logo" className="logo-img" />
        <h1>Smart Navigation Filter</h1>
        <p className="tagline">Smart Navigation. Safe Paths</p>
        <div className="welcome-buttons">
          <button className="btn-primary" onClick={() => onNavigate('signup')}>Create Account</button>
          <button className="btn-secondary" onClick={() => onNavigate('login')}>Log In</button>
        </div>
        <p className="footer-text">Rutgers ECE Capstone S26-10</p>
      </div>
    </div>
  );
}

// ============================================================
// SIGNUP PAGE
// ============================================================
function SignupPage({ onNavigate, onSignup, loading }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [disabilities, setDisabilities] = useState({
    wheelchair: false, visuallyImpaired: false, hearingImpaired: false, anxiety: false, none: false,
  });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    const anySelected = Object.values(disabilities).some(v => v);
    if (!anySelected) { setError('Please select at least one accessibility option (or "None")'); return; }
    const result = await onSignup(name.trim(), email.trim().toLowerCase(), password, disabilities);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <button className="back-btn" onClick={() => onNavigate('welcome')}>Back</button>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Set up your navigation profile</p>
        {error && <div className="error-msg">{error}</div>}
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Accessibility Needs <span className="required">*required</span></label>
          <p className="field-hint" style={{ color: '#4ade80'}}>Select all that apply.</p>
          <DisabilitySelector disabilities={disabilities} onChange={setDisabilities} />
        </div>
        <button className="btn-primary full-width" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
        <p className="switch-text" style={{ color: '#4ade80'}}>
          Already have an account? <span className="link" onClick={() => onNavigate('login')} style={{ color: '#e8f0f8'}}>Log in</span>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage({ onNavigate, onLogin, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email'); return; }
    if (!password) { setError('Please enter your password'); return; }
    const result = await onLogin(email.trim().toLowerCase(), password);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <button className="back-btn" onClick={() => onNavigate('welcome')}>Back</button>
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Log in to your account</p>
        {error && <div className="error-msg">{error}</div>}
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>
        <button className="btn-primary full-width" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <p className="switch-text" style={{ color: '#4ade80'}}>
          Don't have an account? <span className="link" onClick={() => onNavigate('signup')} style={{ color: '#e8f0f8'}}>Create one</span>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LOADING
// ============================================================
function LoadingScreen() {
  return (
    <div className="page welcome-page">
      <div className="welcome-content">
        <img src={logo} alt="Logo" className="logo-img" />
        <h1>Smart Navigation Filter</h1>
        <p className="tagline">Loading...</p>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS PAGE
// ============================================================
function SettingsPage({ profile, onSave, onBack, onLogout }) {
  const [name, setName] = useState(profile?.name || '');
  const [disabilities, setDisabilities] = useState(
    profile?.disabilities || { wheelchair: false, visuallyImpaired: false, hearingImpaired: false, anxiety: false, none: false }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError(''); setSaved(false);
    if (!name.trim()) { setError('Please enter your name'); return; }
    const anySelected = Object.values(disabilities).some(v => v);
    if (!anySelected) { setError('Please select at least one accessibility option (or "None")'); return; }
    setSaving(true);
    const result = await onSave({ name: name.trim(), disabilities });
    setSaving(false);
    if (result?.error) { setError(result.error); }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card settings-card">
        <button className="back-btn" onClick={onBack}>Back to Home</button>
        <h2>Settings</h2>
        <p className="auth-subtitle">Update your profile and accessibility needs</p>
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">Settings saved successfully!</div>}
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={auth.currentUser?.email || ''} disabled className="input-disabled" />
          <p className="field-hint" style={{color: '#20a840',}}>Email cannot be changed</p>
        </div>
        <div className="form-group">
          <label>Accessibility Needs</label>
          <DisabilitySelector disabilities={disabilities} onChange={setDisabilities} />
        </div>
        <button className="btn-primary full-width" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <div className="settings-divider"></div>
        <div className="settings-section">
          <h3>Account</h3>
          <button className="btn-danger-outline full-width" onClick={onLogout}>Log Out</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PANIC PAGE
// ============================================================
const RESCUE_PHONE = '9084229683'; // Rescuer phone number

async function sendSMS(phone, message) {
  try {
    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message, key: 'textbelt' }),
    });
    const data = await response.json();
    return data.success;
  } catch (e) {
    console.error('SMS error:', e);
    return false;
  }
}

function PanicPage({ user, profile, onBack, currentLocation }) {
  const [status, setStatus] = useState('confirm'); // confirm | sending | sent | error
  const [alertId, setAlertId] = useState(null);
  const [smsSent, setSmsSent] = useState(false);

  const rescueUrl = alertId
    ? `https://smart-nav-fire.web.app/rescue.html?alert=${alertId}`
    : null;

  const sendAlert = async () => {
    setStatus('sending');
    try {
      const alertData = {
        userId: user.uid,
        userName: profile?.name || 'Unknown User',
        location: currentLocation || 'UC_T3',
        timestamp: serverTimestamp(),
        active: true,
        disabilities: profile?.disabilities || {},
      };
      const ref = await addDoc(collection(db, 'rescue_alerts'), alertData);
      setAlertId(ref.id);

      // Send SMS with rescue link
      const rescueLink = `https://smart-nav-fire.web.app/rescue.html?alert=${ref.id}`;
      const smsMessage = `🆘 EMERGENCY ALERT\n${profile?.name || 'Someone'} needs help!\nLocation: ${currentLocation || 'Unknown'}\nRescue map: ${rescueLink}`;
      const sent = await sendSMS(RESCUE_PHONE, smsMessage);
      setSmsSent(sent);
      setStatus('sent');
    } catch (err) {
      console.error('Failed to send alert:', err);
      setStatus('error');
    }
  };

  const cancelAlert = async () => {
    if (!alertId) return;
    try {
      await updateDoc(doc(db, 'rescue_alerts', alertId), { active: false });
    } catch (e) {}
    setAlertId(null);
    setStatus('confirm');
    onBack();
  };

  return (
    <div className="panic-page">
      <div className="panic-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', width: '100%', maxWidth: '360px' }}>

        {status === 'confirm' && (
          <>
            <div style={{ fontSize: '72px' }}>🆘</div>
            <h1 style={{ color: 'var(--text)', textAlign: 'center', fontSize: '1.8rem', fontWeight: 700 }}>Emergency Alert</h1>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.95rem', maxWidth: '300px' }}>
              This will send an SMS to the rescue team with your location and a map link.
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '14px 20px', borderRadius: 'var(--radius-md)', width: '100%', textAlign: 'center' }}>
              <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Your location</p>
              <p style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '15px', fontFamily: "'DM Mono', monospace" }}>
                📍 {currentLocation || 'Not selected — tap a node on the map first'}
              </p>
            </div>
            {!currentLocation && (
              <p style={{ color: '#f87171', fontSize: '13px', textAlign: 'center' }}>
                ⚠️ Please go back and tap your location on the map first
              </p>
            )}
            <button
              onClick={sendAlert}
              disabled={!currentLocation}
              style={{
                width: '160px', height: '160px', borderRadius: '50%',
                background: currentLocation ? 'var(--red)' : 'var(--surface-2)',
                color: 'var(--text)', fontSize: '18px', fontWeight: 'bold',
                border: `6px solid ${currentLocation ? 'rgba(255,120,120,0.6)' : 'var(--border)'}`,
                boxShadow: currentLocation ? '0 0 40px rgba(239,68,68,0.5)' : 'none',
                cursor: currentLocation ? 'pointer' : 'not-allowed',
              }}
            >
              SEND<br />ALERT
            </button>
            <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--green)', padding: '12px 32px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginTop: '8px', fontWeight: 600 }}>
              Cancel
            </button>
          </>
        )}

        {status === 'sending' && (
          <>
            <div style={{ fontSize: '60px' }}>📡</div>
            <h2 style={{ color: 'var(--text)' }}>Sending Alert...</h2>
            <p style={{ color: 'var(--text-muted)' }}>Notifying rescue team</p>
          </>
        )}

        {status === 'sent' && (
          <>
            <div style={{ fontSize: '60px' }}>✅</div>
            <h2 style={{ color: 'var(--green)', textAlign: 'center' }}>Rescue Team Notified</h2>
            <div style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)', padding: '16px', borderRadius: 'var(--radius-md)', width: '100%', textAlign: 'center' }}>
              <p style={{ color: 'var(--green)', fontWeight: 'bold', fontSize: '1rem', marginBottom: '8px' }}>
                {smsSent ? '📱 SMS sent to rescue team!' : '📋 Alert saved (SMS quota exceeded for today)'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Stay calm. Remain in a safe area or move to the nearest refuge zone. Help is on the way.
              </p>
            </div>

            {rescueUrl && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', width: '100%' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '6px' }}>Rescue team link (share manually if needed):</p>
                <p style={{ color: 'var(--blue-muted)', fontSize: '12px', wordBreak: 'break-all', marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>{rescueUrl}</p>
                <button
                  onClick={() => navigator.clipboard?.writeText(rescueUrl)}
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px' }}
                >
                  Copy Link
                </button>
              </div>
            )}

            <button onClick={cancelAlert} className="btn-danger-outline full-width">Cancel Alert</button>
            <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '12px 32px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
              Back to Map
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '60px' }}>❌</div>
            <h2 style={{ color: '#f87171', textAlign: 'center' }}>Failed to Send</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Check your connection and try again.</p>
            <button onClick={() => setStatus('confirm')} className="btn-primary full-width">Try Again</button>
            <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '12px 32px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
              Go Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAP CONTROLS PANEL
// ============================================================
function MapControlsPanel({ open, onClose }) {
  const [voice, setVoice]           = useState(true);
  const [vibration, setVibration]   = useState(true);
  const [showNodes, setShowNodes]   = useState(true);
  const [wheelchair, setWheelchair] = useState(false);

  if (!open) return null;
  return (
    <>
      <div className="mcp-backdrop" onClick={onClose} />
      <div className="mcp-panel">
        <div className="mcp-header">
          <span className="mcp-title">Map Controls</span>
          <button className="mcp-close" onClick={onClose}>✕</button>
        </div>
        <div className="mcp-list">
          {[
            { icon: '🔊', label: 'Voice',       val: voice,      set: setVoice },
            { icon: '📳', label: 'Vibration',   val: vibration,  set: setVibration },
            { icon: '📍', label: 'Show Nodes',  val: showNodes,  set: setShowNodes },
            { icon: '♿', label: 'Wheelchair',  val: wheelchair, set: setWheelchair },

          ].map(({ icon, label, val, set }) => (
            <div key={label} className="mcp-row">
              <span className="mcp-row-icon">{icon}</span>
              <span className="mcp-row-label">{label}</span>
              <button className={`mcp-toggle ${val ? 'on' : ''}`} onClick={() => set(v => !v)}>
                <span className="mcp-toggle-thumb" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================
function MainScreen({ user, profile, onNavigate, onLogout, onLocationUpdate,showVibGuide, setShowVibGuide }) {
  const [mapMode, setMapMode]           = useState('navigate');
  const [mapPanelOpen, setMapPanelOpen] = useState(false);

  return (
    <div className="page main-page">
      {/* HEADER */}
      <div className="main-header">
        <div className="main-header-left" style={{ flex: 1 }}>
          <h2 style={{ whiteSpace: 'nowrap' }}>Smart Navigation Filter</h2>
        </div>

        <div className="main-header-right">
          <span className="user-name">
             {profile?.name ? profile.name.split(' ')[0] : 'User'}
          </span>
          <button className="btn-icon-glass" onClick={() => onNavigate('settings')} title="Settings">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#e8f0f8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
        </div>

      </div>

      {/* MODE TABS */}
      <div className="mode-tabs">
        <button className={`mode-tab ${mapMode === 'navigate' ? 'active' : ''}`} onClick={() => setMapMode('navigate')}>
          🧭 Navigate
        </button>
        <button className={`mode-tab ${mapMode === 'view' ? 'active' : ''}`} onClick={() => setMapMode('view')}>
          🏢 View Building
        </button>
      </div>

      {/* MAP WRAPPER — contains map, overlay instructions, and footer actions */}
      <div className="map-wrapper">
        {/* The Map components themselves usually handle their own internal instruction bars */}
        {mapMode === 'navigate' && (
          <MapView3D profile={profile} mode="navigate" onLocationUpdate={onLocationUpdate} />
        )}
        {mapMode === 'view' && <MapView profile={profile} mode="view" />}

        {/* SLIDE-UP SETTINGS PANEL — placed here to stay within mobile bounds */}
        <MapControlsPanel open={mapPanelOpen} onClose={() => setMapPanelOpen(false)} />

        {/* BOTTOM ACTIONS ROW — fixed at the bottom of the map area */}
        <div className="bottom-actions-row">
          <button className="fab-sos" onClick={() => onNavigate('panic')}>
            SOS
          </button>

            <button 
              className="vibration-btn"
              onClick={() => { 
                setShowVibGuide(true); 
                if (typeof setShowSettings === 'function') setShowSettings(false); 
              }}
            >
              📳 Vibration Guide
            </button>

          {/* Look for this button and update it: */}
          <button 
            className="fab-settings" 
            onClick={() => setMapPanelOpen(true)}
            title="Settings"
          >
            {/* Replace the ⚙️ emoji with this SVG ⬇️ */}
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#20a840" // This sets the green color
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="green-setting-wheel" // We add this class to style it
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// VIBRATION ENGINE (for deaf/hearing impaired users)
// ============================================================
// Patterns: different NUMBER of buzzes — 350ms pause between each for easy counting
const VIBRATION_PATTERNS = {
  straight:  [200],                                        // 1 buzz
  left:      [200, 350, 200],                              // 2 buzzes
  right:     [200, 350, 200, 350, 200],                    // 3 buzzes
  start:     [200, 350, 200, 350, 200, 350, 200],          // 4 buzzes
  special:   [200, 350, 200, 350, 200, 350, 200, 350, 200], // 5 buzzes (elevator/ramp/stairs)
  arrive:    [800],                                        // 1 long buzz
  emergency: [200, 80, 200, 80, 200, 80, 200, 80, 200, 80, 500], // rapid pulses + long
};

function vibrate(type) {
  if (!('vibrate' in navigator)) return;
  const pattern = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.straight;
  navigator.vibrate(pattern);
}

function vibrateEmergency() {
  if (!('vibrate' in navigator)) return;
  // Strong repeated pattern for emergency — runs 3 times
  navigator.vibrate([
    200, 80, 200, 80, 200, 80, 200, 80, 200, 300,
    200, 80, 200, 80, 200, 80, 200, 80, 200, 300,
    500, 200, 500,
  ]);
}

function stopVibration() {
  if ('vibrate' in navigator) navigator.vibrate(0);
}

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [currentPage, setCurrentPage] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showVibGuide, setShowVibGuide] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) setUserProfile(profileDoc.data());
        } catch (err) {
          console.error('Error loading profile:', err);
        }
        setCurrentPage('main');
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setCurrentPage('welcome');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignup = async (name, email, password, disabilities) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const profile = { name, email, disabilities, createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'users', userCredential.user.uid), profile);
      setUserProfile(profile);
      setCurrentPage('main');
      setLoading(false);
      return {};
    } catch (err) {
      setLoading(false);
      return { error: firebaseErrorMessage(err.code) };
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profileDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (profileDoc.exists()) setUserProfile(profileDoc.data());
      setCurrentPage('main');
      setLoading(false);
      return {};
    } catch (err) {
      setLoading(false);
      return { error: firebaseErrorMessage(err.code) };
    }
  };

  const handleSaveSettings = async (updates) => {
    if (!currentUser) return { error: 'Not logged in' };
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        name: updates.name,
        disabilities: updates.disabilities,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setUserProfile(prev => ({ ...prev, name: updates.name, disabilities: updates.disabilities }));
      return {};
    } catch (err) {
      return { error: 'Failed to save settings. Please try again.' };
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error('Logout error:', err); }
  };


  return (
    <>
      {currentPage === 'loading' && <LoadingScreen />}
      {currentPage === 'welcome' && <WelcomePage onNavigate={setCurrentPage} />}
      {currentPage === 'signup' && <SignupPage onNavigate={setCurrentPage} onSignup={handleSignup} loading={loading} />}
      {currentPage === 'login' && <LoginPage onNavigate={setCurrentPage} onLogin={handleLogin} loading={loading} />}
      {currentPage === 'main' && currentUser && (
        <MainScreen
          user={currentUser}
          profile={userProfile}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
          onLocationUpdate={setCurrentLocation}
          showVibGuide={showVibGuide}
          setShowVibGuide={setShowVibGuide}
        />
      )}

      {/* VIBRATION GUIDE MODAL */}
    {showVibGuide && (
      <div className="vib-modal-overlay" onClick={() => setShowVibGuide(false)}>
        <div className="vib-modal" onClick={(e) => e.stopPropagation()}>
          <div className="vib-modal-header">
            <h3>📳 Vibration Guide</h3>
            <button className="vib-modal-close" onClick={() => setShowVibGuide(false)}>✕</button>
          </div>

          <p className="vib-modal-desc">
            Each navigation direction has a unique vibration pattern.
            Press <strong>Test</strong> to feel each pattern.
          </p>

          <div className="vib-modal-list">
            {[
              { icon: '⬆️', label: 'Continue Straight', desc: '1 buzz', type: 'straight', voice: 'Continue straight. 1 buzz.' },
              { icon: '⬅️', label: 'Turn Left', desc: '2 buzzes', type: 'left', voice: 'Turn left. 2 buzzes.' },
              { icon: '➡️', label: 'Turn Right', desc: '3 buzzes', type: 'right', voice: 'Turn right. 3 buzzes.' },
              { icon: '📍', label: 'Route Started', desc: '4 buzzes', type: 'start', voice: 'Route started. 4 buzzes.' },
              { icon: '⚡', label: 'Elevator / Ramp / Stairs', desc: '5 buzzes', type: 'special', voice: 'Elevator, ramp, or stairs. 5 buzzes.' },
              { icon: '🏁', label: 'You Have Arrived', desc: '1 long buzz', type: 'arrive', voice: 'You have arrived. 1 long buzz.' },
              { icon: '🔥', label: 'FIRE EMERGENCY', desc: 'Rapid intense pulses', type: 'emergency', voice: 'Fire emergency. Rapid intense vibration pulses.' },
            ].map((item, i) => (
              <div key={i} className={`vib-modal-item ${item.type === 'emergency' ? 'emergency' : ''}`}>
                <div className="vib-modal-item-left">
                  <span className="vib-modal-icon">{item.icon}</span>
                  <div>
                    <div className="vib-modal-label">{item.label}</div>
                    <div className="vib-modal-pattern">{item.desc}</div>
                  </div>
                </div>
                <button
                  className={`vib-test-btn ${item.type === 'emergency' ? 'emergency' : ''}`}
                  onClick={() => {
                    if (item.type === 'emergency') {
                      vibrateEmergency();
                    } else {
                      vibrate(item.type);
                    }
                    speak(item.voice);
                  }}
                >
                  ▶ Test
                </button>
              </div>
            ))}
          </div>

          <div className="vib-modal-footer">
            <button
              className="vib-readall-btn"
              onClick={() => {
                const items = [
                  { type: 'straight', voice: 'Continue straight. 1 buzz.', delay: 0 },
                  { type: 'left', voice: 'Turn left. 2 buzzes.', delay: 3000 },
                  { type: 'right', voice: 'Turn right. 3 buzzes.', delay: 6000 },
                  { type: 'start', voice: 'Route started. 4 buzzes.', delay: 9000 },
                  { type: 'special', voice: 'Elevator, ramp, or stairs. 5 buzzes.', delay: 12000 },
                  { type: 'arrive', voice: 'You have arrived. 1 long buzz.', delay: 15000 },
                  { type: 'emergency', voice: 'Fire emergency. Rapid intense pulses.', delay: 18000 },
                ];
                speak('Vibration guide.');
                items.forEach(item => {
                  setTimeout(() => {
                    speak(item.voice);
                    if (item.type === 'emergency') {
                      vibrateEmergency();
                    } else {
                      vibrate(item.type);
                    }
                  }, item.delay);
                });
              }}
            >
              🔊 Read All Aloud
            </button>
            <button className="vib-close-btn" onClick={() => setShowVibGuide(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}

      {currentPage === 'settings' && currentUser && (
        <SettingsPage profile={userProfile} onSave={handleSaveSettings} onBack={() => setCurrentPage('main')} onLogout={handleLogout} />
      )}
      
      {currentPage === 'panic' && currentUser && (
        <PanicPage
          user={currentUser}
          profile={userProfile}
          onBack={() => setCurrentPage('main')}
          currentLocation={currentLocation}
        />
      )}
    </>
  );
}

export default App;
