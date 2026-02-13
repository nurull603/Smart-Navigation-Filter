import { useState } from 'react';
import './App.css';

// ============================================================
// PAGE COMPONENTS
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

function SignupPage({ onNavigate, onSignup }) {
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
      // "None" unchecks everything else
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
        none: false, // uncheck "none" if selecting a disability
      }));
    }
  };

  const handleSubmit = () => {
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

    // Check at least one disability option selected
    const anySelected = Object.values(disabilities).some(v => v);
    if (!anySelected) {
      setError('Please select at least one accessibility option (or "None")');
      return;
    }

    // Create user object
    const user = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password, // In real app, this gets hashed by Firebase
      disabilities,
      createdAt: new Date().toISOString(),
    };

    onSignup(user);
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
              <input
                type="checkbox"
                checked={disabilities.wheelchair}
                onChange={() => handleDisabilityChange('wheelchair')}
              />
              <span className="checkbox-icon">♿</span>
              <span>Wheelchair User</span>
            </label>

            <label className={`checkbox-item ${disabilities.visuallyImpaired ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={disabilities.visuallyImpaired}
                onChange={() => handleDisabilityChange('visuallyImpaired')}
              />
              <span className="checkbox-icon">👁️</span>
              <span>Visually Impaired</span>
            </label>

            <label className={`checkbox-item ${disabilities.hearingImpaired ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={disabilities.hearingImpaired}
                onChange={() => handleDisabilityChange('hearingImpaired')}
              />
              <span className="checkbox-icon">🦻</span>
              <span>Hearing Impaired</span>
            </label>

            <label className={`checkbox-item ${disabilities.anxiety ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={disabilities.anxiety}
                onChange={() => handleDisabilityChange('anxiety')}
              />
              <span className="checkbox-icon">💙</span>
              <span>Anxiety / Sensory Sensitivity</span>
            </label>

            <label className={`checkbox-item ${disabilities.none ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={disabilities.none}
                onChange={() => handleDisabilityChange('none')}
              />
              <span className="checkbox-icon">✓</span>
              <span>None of the above</span>
            </label>
          </div>
        </div>

        <button className="btn-primary full-width" onClick={handleSubmit}>
          Create Account
        </button>

        <p className="switch-text">
          Already have an account?{' '}
          <span className="link" onClick={() => onNavigate('login')}>Log in</span>
        </p>
      </div>
    </div>
  );
}

function LoginPage({ onNavigate, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    onLogin(email.trim().toLowerCase(), password);
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

        <button className="btn-primary full-width" onClick={handleSubmit}>
          Log In
        </button>

        <p className="switch-text">
          Don't have an account?{' '}
          <span className="link" onClick={() => onNavigate('signup')}>Create one</span>
        </p>
      </div>
    </div>
  );
}

function MainScreen({ user, onLogout }) {
  return (
    <div className="page main-page">
      <div className="main-header">
        <div className="main-header-left">
          <span className="logo-small">🧭</span>
          <h2>Smart Navigation Filter</h2>
        </div>
        <div className="main-header-right">
          <span className="user-name">Hi, {user.name}</span>
          <button className="btn-small" onClick={onLogout}>Log Out</button>
        </div>
      </div>

      <div className="main-content">
        <div className="placeholder-map">
          <div className="placeholder-icon">🗺️</div>
          <h3>Map Coming Soon</h3>
          <p>The navigation map will appear here once we build it.</p>
          <p className="user-info-display">
            Your profile: <strong>{user.name}</strong> ({user.email})
          </p>
          <div className="user-disabilities">
            {user.disabilities.wheelchair && <span className="tag">♿ Wheelchair</span>}
            {user.disabilities.visuallyImpaired && <span className="tag">👁️ Visually Impaired</span>}
            {user.disabilities.hearingImpaired && <span className="tag">🦻 Hearing Impaired</span>}
            {user.disabilities.anxiety && <span className="tag">💙 Anxiety</span>}
            {user.disabilities.none && <span className="tag">✓ No accessibility needs</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP — Page Router
// ============================================================
function App() {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [currentUser, setCurrentUser] = useState(null);

  // Temporary user storage (will be replaced by Firebase later)
  const [users, setUsers] = useState([]);

  const handleSignup = (user) => {
    // Check if email already exists
    if (users.find(u => u.email === user.email)) {
      alert('An account with this email already exists. Please log in.');
      return;
    }

    setUsers(prev => [...prev, user]);
    setCurrentUser(user);
    setCurrentPage('main');
  };

  const handleLogin = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      setCurrentPage('main');
    } else {
      alert('Invalid email or password. Please try again.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('welcome');
  };

  return (
    <>
      {currentPage === 'welcome' && (
        <WelcomePage onNavigate={setCurrentPage} />
      )}
      {currentPage === 'signup' && (
        <SignupPage onNavigate={setCurrentPage} onSignup={handleSignup} />
      )}
      {currentPage === 'login' && (
        <LoginPage onNavigate={setCurrentPage} onLogin={handleLogin} />
      )}
      {currentPage === 'main' && currentUser && (
        <MainScreen user={currentUser} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
