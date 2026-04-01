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
    { key: 'visuallyImpaired', icon: '👁️', label: 'Visually Impaired' },
    { key: 'hearingImpaired', icon: '🦻', label: 'Hearing Impaired' },
    { key: 'anxiety', icon: '💙', label: 'Anxiety / Sensory Sensitivity' },
    { key: 'none', icon: '✓', label: 'None of the above' },
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
        <p className="tagline">Intelligent indoor navigation for everyone</p>
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
          <p className="field-hint">Select all that apply.</p>
          <DisabilitySelector disabilities={disabilities} onChange={setDisabilities} />
        </div>
        <button className="btn-primary full-width" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
        <p className="switch-text">
          Already have an account? <span className="link" onClick={() => onNavigate('login')}>Log in</span>
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
        <p className="switch-text">
          Don't have an account? <span className="link" onClick={() => onNavigate('signup')}>Create one</span>
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
          <p className="field-hint">Email cannot be changed</p>
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
      const smsMessage = `🆘 EMERGENCY ALERT
${profile?.name || 'Someone'} needs help!
Location: ${currentLocation || 'Unknown'}
Rescue map: ${rescueLink}`;
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

  const btnStyle = (bg, border) => ({
    width: '100%', padding: '14px', borderRadius: '10px',
    background: bg, border: `1px solid ${border}`,
    color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
  });

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '16px' }}>

      {status === 'confirm' && (
        <>
          <div style={{ fontSize: '72px' }}>🆘</div>
          <h1 style={{ color: 'white', textAlign: 'center', fontSize: '1.8rem' }}>Emergency Alert</h1>
          <p style={{ color: '#aaa', textAlign: 'center', fontSize: '0.95rem', maxWidth: '300px' }}>
            This will send an SMS to the rescue team with your location and a map link.
          </p>
          <div style={{ background: '#1a1a1a', padding: '14px 20px', borderRadius: '10px', width: '100%', textAlign: 'center' }}>
            <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '4px' }}>Your location</p>
            <p style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
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
              background: currentLocation ? 'red' : '#555',
              color: 'white', fontSize: '18px', fontWeight: 'bold',
              border: `6px solid ${currentLocation ? '#ff6666' : '#777'}`,
              boxShadow: currentLocation ? '0 0 40px rgba(255,0,0,0.5)' : 'none',
              cursor: currentLocation ? 'pointer' : 'not-allowed',
            }}
          >
            SEND<br />ALERT
          </button>
          <button onClick={onBack} style={{ background: 'none', border: '1px solid #555', color: '#aaa', padding: '12px 32px', borderRadius: '8px', cursor: 'pointer', marginTop: '8px' }}>
            Cancel
          </button>
        </>
      )}

      {status === 'sending' && (
        <>
          <div style={{ fontSize: '60px' }}>📡</div>
          <h2 style={{ color: 'white' }}>Sending Alert...</h2>
          <p style={{ color: '#aaa' }}>Notifying rescue team</p>
        </>
      )}

      {status === 'sent' && (
        <>
          <div style={{ fontSize: '60px' }}>✅</div>
          <h2 style={{ color: '#4ade80', textAlign: 'center' }}>Rescue Team Notified</h2>
          <div style={{ background: '#0d2010', border: '1px solid #2a4a2a', padding: '16px', borderRadius: '12px', width: '100%', textAlign: 'center' }}>
            <p style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1rem', marginBottom: '8px' }}>
              {smsSent ? '📱 SMS sent to rescue team!' : '📋 Alert saved (SMS quota exceeded for today)'}
            </p>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
              Stay calm. Remain in a safe area or move to the nearest refuge zone. Help is on the way.
            </p>
          </div>

          {rescueUrl && (
            <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '12px', width: '100%' }}>
              <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '6px' }}>Rescue team link (share manually if needed):</p>
              <p style={{ color: '#60a5fa', fontSize: '12px', wordBreak: 'break-all', marginBottom: '8px' }}>{rescueUrl}</p>
              <button
                onClick={() => navigator.clipboard?.writeText(rescueUrl)}
                style={{ background: '#2a2a2a', border: '1px solid #444', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
              >
                Copy Link
              </button>
            </div>
          )}

          <button onClick={cancelAlert} style={btnStyle('#7f1d1d', '#991b1b')}>
            Cancel Alert
          </button>
          <button onClick={onBack} style={{ background: 'none', border: '1px solid #555', color: '#aaa', padding: '12px 32px', borderRadius: '8px', cursor: 'pointer' }}>
            Back to Map
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ fontSize: '60px' }}>❌</div>
          <h2 style={{ color: '#f87171', textAlign: 'center' }}>Failed to Send</h2>
          <p style={{ color: '#aaa', textAlign: 'center' }}>Check your connection and try again.</p>
          <button onClick={() => setStatus('confirm')} style={btnStyle('red', '#ff4444')}>Try Again</button>
          <button onClick={onBack} style={{ background: 'none', border: '1px solid #555', color: '#aaa', padding: '12px 32px', borderRadius: '8px', cursor: 'pointer' }}>
            Go Back
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================
function MainScreen({ user, profile, onNavigate, onLogout, onLocationUpdate }) {
  const [mapMode, setMapMode] = useState('navigate');

  return (
    <div className="page main-page">
      {/* HEADER */}
      <div className="main-header">
        <div className="main-header-left">
          <span className="logo-small">🧭</span>
          <h2>Smart Navigation Filter</h2>
        </div>
        <div className="main-header-right">
          <span className="user-name">Hi, {profile?.name || 'User'}</span>
          <button className="btn-icon" onClick={() => onNavigate('settings')} title="Settings">⚙️</button>
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

      {/* MAP */}
      {mapMode === 'navigate' && (
        <MapView3D
          profile={profile}
          mode="navigate"
          onLocationUpdate={onLocationUpdate}
        />
      )}
      {mapMode === 'view' && <MapView profile={profile} mode="view" />}

      {/* PANIC BUTTON */}
      <button
        onClick={() => onNavigate('panic')}
        style={{
          position: 'fixed',
          bottom: '32px',
          left: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'red',
          color: 'white',
          fontSize: '26px',
          border: '3px solid #ff6666',
          boxShadow: '0 0 20px rgba(255,0,0,0.5)',
          zIndex: 9999,
          cursor: 'pointer',
        }}
        title="Emergency Alert"
      >
        🆘
      </button>
    </div>
  );
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
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: updates.name,
        disabilities: updates.disabilities,
        updatedAt: new Date().toISOString(),
      });
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
        />
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
