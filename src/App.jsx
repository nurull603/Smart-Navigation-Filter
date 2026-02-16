import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './App.css';

// ============================================================
// FIREBASE ERROR MESSAGES (human-readable)
// ============================================================
function firebaseErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please create one.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// ============================================================
// WELCOME PAGE
// ============================================================
function WelcomePage({ onNavigate }) {
  return (
    <div className="page welcome-page">
      <div className="welcome-content">
        <div className="logo">🧭</div>
        <h1>Smart Navigation Filter</h1>
        <p className="tagline">Intelligent indoor navigation for everyone</p>

        <div className="welcome-buttons">
          <button className="btn-primary" onClick={() => onNavigate('signup')}>
            Create Account
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('login')}>
            Log In
          </button>
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
    wheelchair: false,
    visuallyImpaired: false,
    hearingImpaired: false,
    anxiety: false,
    none: false,
  });
  const [error, setError] = useState('');

  const handleDisabilityChange = (key) => {
    if (key === 'none') {
      setDisabilities({
        wheelchair: false,
        visuallyImpaired: false,
        hearingImpaired: false,
        anxiety: false,
        none: true,
      });
    } else {
      setDisabilities(prev => ({
        ...prev,
        [key]: !prev[key],
        none: false,
      }));
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const anySelected = Object.values(disabilities).some(v => v);
    if (!anySelected) {
      setError('Please select at least one accessibility option (or "None")');
      return;
    }

    const result = await onSignup(name.trim(), email.trim().toLowerCase(), password, disabilities);
    if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <button className="back-btn" onClick={() => onNavigate('welcome')}>
          ← Back
        </button>

        <h2>Create Account</h2>
        <p className="auth-subtitle">Set up your navigation profile</p>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Accessibility Needs <span className="required">*required</span></label>
          <p className="field-hint">Select all that apply. This determines your navigation options.</p>

          <div className="checkbox-group">
            <label className={`checkbox-item ${disabilities.wheelchair ? 'checked' : ''}`}>
              <input type="checkbox" checked={disabilities.wheelchair} onChange={() => handleDisabilityChange('wheelchair')} />
              <span className="checkbox-icon">♿</span>
              <span>Wheelchair User</span>
            </label>

            <label className={`checkbox-item ${disabilities.visuallyImpaired ? 'checked' : ''}`}>
              <input type="checkbox" checked={disabilities.visuallyImpaired} onChange={() => handleDisabilityChange('visuallyImpaired')} />
              <span className="checkbox-icon">👁️</span>
              <span>Visually Impaired</span>
            </label>

            <label className={`checkbox-item ${disabilities.hearingImpaired ? 'checked' : ''}`}>
              <input type="checkbox" checked={disabilities.hearingImpaired} onChange={() => handleDisabilityChange('hearingImpaired')} />
              <span className="checkbox-icon">🦻</span>
              <span>Hearing Impaired</span>
            </label>

            <label className={`checkbox-item ${disabilities.anxiety ? 'checked' : ''}`}>
              <input type="checkbox" checked={disabilities.anxiety} onChange={() => handleDisabilityChange('anxiety')} />
              <span className="checkbox-icon">💙</span>
              <span>Anxiety / Sensory Sensitivity</span>
            </label>

            <label className={`checkbox-item ${disabilities.none ? 'checked' : ''}`}>
              <input type="checkbox" checked={disabilities.none} onChange={() => handleDisabilityChange('none')} />
              <span className="checkbox-icon">✓</span>
              <span>None of the above</span>
            </label>
          </div>
        </div>

        <button className="btn-primary full-width" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p className="switch-text">
          Already have an account?{' '}
          <span className="link" onClick={() => onNavigate('login')}>Log in</span>
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

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    const result = await onLogin(email.trim().toLowerCase(), password);
    if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <button className="back-btn" onClick={() => onNavigate('welcome')}>
          ← Back
        </button>

        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Log in to your account</p>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <button className="btn-primary full-width" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p className="switch-text">
          Don't have an account?{' '}
          <span className="link" onClick={() => onNavigate('signup')}>Create one</span>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LOADING SCREEN
// ============================================================
function LoadingScreen() {
  return (
    <div className="page welcome-page">
      <div className="welcome-content">
        <div className="logo">🧭</div>
        <h1>Smart Navigation Filter</h1>
        <p className="tagline">Loading...</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN SCREEN (after login)
// ============================================================
function MainScreen({ user, profile, onLogout }) {
  return (
    <div className="page main-page">
      <div className="main-header">
        <div className="main-header-left">
          <span className="logo-small">🧭</span>
          <h2>Smart Navigation Filter</h2>
        </div>
        <div className="main-header-right">
          <span className="user-name">Hi, {profile?.name || 'User'}</span>
          <button className="btn-small" onClick={onLogout}>Log Out</button>
        </div>
      </div>

      <div className="main-content">
        <div className="placeholder-map">
          <div className="placeholder-icon">🗺️</div>
          <h3>Map Coming Soon</h3>
          <p>The navigation map will appear here once we build it.</p>

          <div className="profile-section">
            <p className="user-info-display">
              <strong>{profile?.name}</strong>
            </p>
            <p className="user-email">{user.email}</p>

            <div className="user-disabilities">
              {profile?.disabilities?.wheelchair && <span className="tag">♿ Wheelchair</span>}
              {profile?.disabilities?.visuallyImpaired && <span className="tag">👁️ Visually Impaired</span>}
              {profile?.disabilities?.hearingImpaired && <span className="tag">🦻 Hearing Impaired</span>}
              {profile?.disabilities?.anxiety && <span className="tag">💙 Anxiety</span>}
              {profile?.disabilities?.none && <span className="tag">✓ No accessibility needs</span>}
            </div>
          </div>

          <div className="success-badge">
            ✅ Firebase Connected — Account saved to cloud
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP — Firebase Auth + Routing
// ============================================================
function App() {
  const [currentPage, setCurrentPage] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Listen for auth state changes (auto-login on refresh!)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data());
          }
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

  // SIGNUP
  const handleSignup = async (name, email, password, disabilities) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const profile = {
        name,
        email,
        disabilities,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), profile);

      setUserProfile(profile);
      setCurrentPage('main');
      setLoading(false);
      return {};
    } catch (err) {
      setLoading(false);
      console.error('Signup error:', err);
      return { error: firebaseErrorMessage(err.code) };
    }
  };

  // LOGIN
  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (profileDoc.exists()) {
        setUserProfile(profileDoc.data());
      }

      setCurrentPage('main');
      setLoading(false);
      return {};
    } catch (err) {
      setLoading(false);
      console.error('Login error:', err);
      return { error: firebaseErrorMessage(err.code) };
    }
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      {currentPage === 'loading' && <LoadingScreen />}
      {currentPage === 'welcome' && <WelcomePage onNavigate={setCurrentPage} />}
      {currentPage === 'signup' && (
        <SignupPage onNavigate={setCurrentPage} onSignup={handleSignup} loading={loading} />
      )}
      {currentPage === 'login' && (
        <LoginPage onNavigate={setCurrentPage} onLogin={handleLogin} loading={loading} />
      )}
      {currentPage === 'main' && currentUser && (
        <MainScreen user={currentUser} profile={userProfile} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
