import './App.css';
import { useEffect, useState } from 'react';
import { ref, set, push, onValue } from 'firebase/database';
import { rtdb } from './firebase';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';

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

  // Load theme from localStorage
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light-mode');

  useEffect(() => {
    const activeRef = ref(rtdb, 'activeStreaks');
    return onValue(activeRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, streak]) => ({
          id,
          ...streak,
        }));
        setActiveStreaks(arr);
      } else {
        setActiveStreaks([]);
      }
    });
  }, []);

  useEffect(() => {
    const historyRef = ref(rtdb, 'pastStreaks');
    return onValue(historyRef, (snap) => {
      const data = snap.val();
      if (data) {
        setPastStreaks(Object.values(data).sort((a, b) => b.startAt - a.startAt));
      } else {
        setPastStreaks([]);
      }
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newElapsed = {};
      activeStreaks.forEach((s) => {
        const now = Date.now();
        const diff = now - s.startAt;
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

  // persist theme
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleStart = () => {
    if (!formData.name.trim()) return alert('Please name your streak');

    const streak = {
      name: formData.name,
      notes: formData.notes,
      startAt: Date.now(),
      targetDate: formData.targetDate ? new Date(formData.targetDate).getTime() : null,
      reward: formData.targetDate ? formData.reward : '',
    };

    const newRef = push(ref(rtdb, 'activeStreaks'));
    set(newRef, streak);

    setFormData({ name: '', notes: '', targetDate: '', reward: '' });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleResetClick = (streak) => {
    setStreakToReset(streak);
    setShowModal(true);
  };

  const confirmReset = () => {
    if (!streakToReset) return;
    const endedStreak = {
      ...streakToReset,
      endAt: Date.now(),
      durationMs: Date.now() - streakToReset.startAt,
    };
    push(ref(rtdb, 'pastStreaks'), endedStreak);
    set(ref(rtdb, `activeStreaks/${streakToReset.id}`), null);
    setShowModal(false);
    setStreakToReset(null);
  };

  const calcProgress = (s) => {
    if (!s.targetDate) return null;
    const now = Date.now();
    const total = s.targetDate - s.startAt;
    const done = Math.min(now - s.startAt, total);
    return Math.max(0, Math.min(100, (done / total) * 100));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark-mode' ? 'light-mode' : 'dark-mode'));
  };

  return (
    <div className={`app-root ${theme} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button
            className="toggle-btn"
            onClick={() => setIsCollapsed(prev => !prev)}
          >
            ☰
          </button>
          {!isCollapsed && <h2>Streak App</h2>}
        </div>
        <nav>
          <ul>
            <li onClick={() => setActivePage('home')}>
              <span className="icon">🏠</span>{!isCollapsed && <span>Home</span>}
            </li>
            <li onClick={() => setActivePage('active')}>
              <span className="icon">🔥</span>{!isCollapsed && <span>Active</span>}
            </li>
            <li onClick={() => setActivePage('history')}>
              <span className="icon">📜</span>{!isCollapsed && <span>History</span>}
            </li>
            <li onClick={() => setActivePage('settings')}>
              <span className="icon">⚙️</span>{!isCollapsed && <span>Settings</span>}
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        {showConfetti && <Confetti width={width} height={height} />}

        {/* HOME PAGE */}
        {activePage === 'home' && (
          <>
            <section className="form-section">
              <h3>Start a new streak</h3>
              <input
                type="text"
                placeholder="Streak name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
              <textarea
                placeholder="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
              <input
                type="datetime-local"
                placeholder="Target date (optional)"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
              />
              {formData.targetDate && (
                <input
                  type="text"
                  placeholder="Reward when target is hit"
                  value={formData.reward}
                  onChange={(e) => setFormData(prev => ({ ...prev, reward: e.target.value }))}
                />
              )}
              <button onClick={handleStart}>Start Streak</button>
            </section>

            {activeStreaks.length > 0 && (
              <section className="active-section">
                <h3>🔥 Current Streaks</h3>
                {activeStreaks.map((s) => (
                  <div key={s.id} className="streak-card">
                    <strong>{s.name}</strong>
                    {s.notes && <p>{s.notes}</p>}
                    <p>
                      {elapsed[s.id]?.days ?? 0}d {elapsed[s.id]?.hours ?? 0}h{' '}
                      {elapsed[s.id]?.minutes ?? 0}m {elapsed[s.id]?.seconds ?? 0}s
                    </p>
                    {s.targetDate && (
                      <div className="progress-container">
                        <div
                          className="progress-bar"
                          style={{ width: `${calcProgress(s)}%` }}
                        ></div>
                      </div>
                    )}
                    {s.targetDate && s.reward && (
                      <small>🎯 Reward: {s.reward}</small>
                    )}
                    <button onClick={() => handleResetClick(s)}>Reset Streak</button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {/* ACTIVE PAGE */}
        {activePage === 'active' && activeStreaks.length > 0 && (
          <section className="active-section">
            <h3>🔥 Active Streaks</h3>
            {activeStreaks.map((s) => (
              <div key={s.id} className="streak-card">
                <strong>{s.name}</strong>
                {s.notes && <p>{s.notes}</p>}
                <p>
                  {elapsed[s.id]?.days ?? 0}d {elapsed[s.id]?.hours ?? 0}h{' '}
                  {elapsed[s.id]?.minutes ?? 0}m {elapsed[s.id]?.seconds ?? 0}s
                </p>
                {s.targetDate && (
                  <div className="progress-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${calcProgress(s)}%` }}
                    ></div>
                  </div>
                )}
                {s.targetDate && s.reward && (
                  <small>🎯 Reward: {s.reward}</small>
                )}
                <button onClick={() => handleResetClick(s)}>Reset Streak</button>
              </div>
            ))}
          </section>
        )}

        {/* HISTORY PAGE */}
        {activePage === 'history' && pastStreaks.length > 0 && (
          <section className="history-section">
            <h3>Past Streaks</h3>
            <ul>
              {pastStreaks.map((s, idx) => {
                const dur = {
                  days: Math.floor(s.durationMs / (1000 * 60 * 60 * 24)),
                  hours: Math.floor((s.durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                  minutes: Math.floor((s.durationMs % (1000 * 60 * 60)) / (1000 * 60)),
                  seconds: Math.floor((s.durationMs % (1000 * 60)) / 1000),
                };
                return (
                  <li key={idx}>
                    <strong>{s.name}</strong> — {dur.days}d {dur.hours}h {dur.minutes}m {dur.seconds}s
                    <br />
                    <small>{new Date(s.startAt).toLocaleString()} → {new Date(s.endAt).toLocaleString()}</small>
                    {s.notes && <p>{s.notes}</p>}
                    {s.reward && <small>🎯 Reward: {s.reward}</small>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* SETTINGS PAGE */}
        {activePage === 'settings' && (
          <section className="settings-section">
            <h3>⚙️ Settings</h3>
            <div className="theme-toggle">
              <span>{theme === 'dark-mode' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={theme === 'dark-mode'}
                  onChange={toggleTheme}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </section>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h4>Confirm Reset</h4>
            <p>
              Are you sure you want to reset the streak{' '}
              <strong>{streakToReset?.name}</strong>?
            </p>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmReset}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
