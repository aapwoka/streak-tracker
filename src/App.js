import './App.css';
import { useEffect, useState } from 'react';
import { ref, set, push, onValue } from 'firebase/database';
import { rtdb, auth, googleProvider } from './firebase';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";

function App() {
  const [activeStreaks, setActiveStreaks] = useState([]);
  const [pastStreaks, setPastStreaks] = useState([]);
  const [formData, setFormData] = useState({ name: '', notes: '', targetDate: '', reward: '' });
  const [elapsed, setElapsed] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [width, height] = useWindowSize();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [streakToReset, setStreakToReset] = useState(null);
  const [activePage, setActivePage] = useState('home');

  // THEME
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light-mode');
  useEffect(() => localStorage.setItem('theme', theme), [theme]);
  const toggleTheme = () => setTheme(prev => (prev === 'dark-mode' ? 'light-mode' : 'dark-mode'));

  // AUTH
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setDisplayName(u.displayName || "");
        setPhotoURL(u.photoURL || "");
      }
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { alert(err.message); }
  };

  const handleAuth = async () => {
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail(""); setPassword("");
    } catch (err) { alert(err.message); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); }
    catch (err) { alert(err.message); }
  };

  const saveProfile = async () => {
    try {
      if (!auth.currentUser) return;
      await updateProfile(auth.currentUser, {
        displayName: displayName || auth.currentUser.displayName,
        photoURL: photoURL || auth.currentUser.photoURL
      });
      alert("Profile updated!");
    } catch (err) {
      alert(err.message);
    }
  };

  // Fetch streaks
  useEffect(() => {
    if (!user) return;
    const activeRef = ref(rtdb, `users/${user.uid}/activeStreaks`);
    return onValue(activeRef, (snap) => {
      const data = snap.val();
      setActiveStreaks(data ? Object.entries(data).map(([id, s]) => ({ id, ...s })) : []);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const historyRef = ref(rtdb, `users/${user.uid}/pastStreaks`);
    return onValue(historyRef, (snap) => {
      const data = snap.val();
      setPastStreaks(data ? Object.values(data).sort((a, b) => b.startAt - a.startAt) : []);
    });
  }, [user]);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const newElapsed = {};
      activeStreaks.forEach(s => {
        const diff = Date.now() - s.startAt;
        newElapsed[s.id] = {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        };
      });
      setElapsed(newElapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeStreaks]);

  const handleStart = () => {
    if (!user) return alert("Please log in!");
    if (!formData.name.trim()) return alert("Please enter a streak name.");
    const streak = {
      name: formData.name,
      notes: formData.notes,
      startAt: Date.now(),
      targetDate: formData.targetDate ? new Date(formData.targetDate).getTime() : null,
      reward: formData.targetDate ? formData.reward : ''
    };
    const newRef = push(ref(rtdb, `users/${user.uid}/activeStreaks`));
    set(newRef, streak);
    setFormData({ name: '', notes: '', targetDate: '', reward: '' });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleResetClick = (streak) => {
    if (!user) return alert("Please log in!");
    setStreakToReset(streak);
    setShowModal(true);
  };

  const confirmReset = () => {
    if (!streakToReset) return;
    const endedStreak = { ...streakToReset, endAt: Date.now(), durationMs: Date.now() - streakToReset.startAt };
    push(ref(rtdb, `users/${user.uid}/pastStreaks`), endedStreak);
    set(ref(rtdb, `users/${user.uid}/activeStreaks/${streakToReset.id}`), null);
    setShowModal(false);
    setStreakToReset(null);
  };

  const calcProgress = (s) => {
    if (!s.targetDate) return 0;
    const now = Date.now();
    const total = s.targetDate - s.startAt;
    const done = Math.min(now - s.startAt, total);
    return Math.max(0, Math.min(100, (done / total) * 100));
  };

  return (
    <div className={`app-root ${theme}`}>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button className="toggle-btn" onClick={() => setIsCollapsed(prev => !prev)}>☰</button>
          {!isCollapsed && <h2>Streaks</h2>}
        </div>
        <nav>
          <ul>
            <li onClick={() => setActivePage('home')}><span className="icon">🏠</span>{!isCollapsed && <span>Home</span>}</li>
            <li onClick={() => setActivePage('active')}><span className="icon">🔥</span>{!isCollapsed && <span>Active</span>}</li>
            <li onClick={() => setActivePage('history')}><span className="icon">📜</span>{!isCollapsed && <span>History</span>}</li>
            <li onClick={() => setActivePage('settings')}><span className="icon">⚙️</span>{!isCollapsed && <span>Profile</span>}</li>
          </ul>
        </nav>
        {user && (
          <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
        )}
      </aside>

      <main className="main-content">
        {showConfetti && <Confetti width={width} height={height} />}

        {!user ? (
          <div className="auth-container">
            <h2>{authMode === "signup" ? "Create Account" : "Login"}</h2>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handleAuth}>{authMode === "signup" ? "Sign Up" : "Login"}</button>
            <p className="switch-auth" onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>
              {authMode === "signup" ? "Already have an account? Login" : "Don’t have an account? Sign Up"}
            </p>
            <div className="divider">OR</div>
            <button className="google-btn" onClick={handleGoogleSignIn}>Continue with Google</button>
          </div>
        ) : (
          <>
            {activePage === 'home' && (
              <section className="form-section">
                <h3>Start a new streak</h3>
                <input type="text" placeholder="Streak name" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                <textarea placeholder="Notes (optional)" value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                <input type="datetime-local" placeholder="Target date (optional)" value={formData.targetDate} onChange={e => setFormData(prev => ({ ...prev, targetDate: e.target.value }))} />
                {formData.targetDate && (
                  <input type="text" placeholder="Reward" value={formData.reward} onChange={e => setFormData(prev => ({ ...prev, reward: e.target.value }))} />
                )}
                <button onClick={handleStart}>Start Streak</button>
              </section>
            )}

            {activePage === 'active' && (
              <section className="active-section">
                <h3>🔥 Active Streaks</h3>
                {activeStreaks.length === 0 && <p>No active streaks</p>}
                {activeStreaks.map(s => (
                  <div key={s.id} className="streak-card">
                    <strong>{s.name}</strong>
                    {s.notes && <p>{s.notes}</p>}
                    <p>{elapsed[s.id]?.days}d {elapsed[s.id]?.hours}h {elapsed[s.id]?.minutes}m {elapsed[s.id]?.seconds}s</p>
                    {s.targetDate && <div className="progress-container"><div className="progress-bar" style={{ width: `${calcProgress(s)}%` }}></div></div>}
                    {s.reward && <small>🎯 {s.reward}</small>}
                    <button onClick={() => handleResetClick(s)}>Reset</button>
                  </div>
                ))}
              </section>
            )}

            {activePage === 'history' && (
              <section className="history-section">
                <h3>📜 Past Streaks</h3>
                {pastStreaks.length === 0 && <p>No past streaks</p>}
                <ul>
                  {pastStreaks.map((s, idx) => {
                    const dur = {
                      days: Math.floor(s.durationMs / (1000 * 60 * 60 * 24)),
                      hours: Math.floor((s.durationMs % (1000 * 60 * 60 * 24) / (1000 * 60 * 60))),
                      minutes: Math.floor((s.durationMs % (1000 * 60 * 60) / (1000 * 60))),
                      seconds: Math.floor((s.durationMs % (1000 * 60)) / 1000)
                    };
                    return <li key={idx}><strong>{s.name}</strong> — {dur.days}d {dur.hours}h {dur.minutes}m {dur.seconds}s</li>;
                  })}
                </ul>
              </section>
            )}

            {activePage === 'settings' && (
              <section className="settings-section">
                <h3>⚙️ Profile</h3>
                <div className="profile-section">
                  {user.photoURL && <img src={user.photoURL} alt="Profile" className="profile-pic" />}
                  <p><strong>Email:</strong> {user.email}</p>
                  <input type="text" placeholder="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                  <input type="text" placeholder="Photo URL" value={photoURL} onChange={e => setPhotoURL(e.target.value)} />
                  <button onClick={saveProfile}>Save Profile</button>
                </div>
                <div className="theme-toggle">
                  <span>{theme === 'dark-mode' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                  <label className="switch">
                    <input type="checkbox" checked={theme === 'dark-mode'} onChange={toggleTheme} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </section>
            )}
          </>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h4>Confirm Reset</h4>
              <p>Reset streak <strong>{streakToReset?.name}</strong>?</p>
              <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="confirm-btn" onClick={confirmReset}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
