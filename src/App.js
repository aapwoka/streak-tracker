import './App.css';
import { useEffect, useState } from 'react';
import { ref, set, push, onValue } from 'firebase/database';
import { rtdb } from './firebase';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';

function App() {
  const [activeStreaks, setActiveStreaks] = useState([]);
  const [pastStreaks, setPastStreaks] = useState([]);
  const [formData, setFormData] = useState({ name: '', notes: '' });
  const [elapsed, setElapsed] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [width, height] = useWindowSize();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [streakToReset, setStreakToReset] = useState(null);

  // Load active streaks
  useEffect(() => {
    const activeRef = ref(rtdb, 'activeStreaks');
    const unsub = onValue(activeRef, (snap) => {
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
    return () => unsub();
  }, []);

  // Load past streaks
  useEffect(() => {
    const historyRef = ref(rtdb, 'pastStreaks');
    const unsub = onValue(historyRef, (snap) => {
      const data = snap.val();
      if (data) {
        setPastStreaks(Object.values(data).sort((a, b) => b.startAt - a.startAt));
      }
    });
    return () => unsub();
  }, []);

  // Update elapsed timers
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

  // Start new streak
  const handleStart = () => {
    if (!formData.name.trim()) return alert('Please name your streak');
    const streak = {
      name: formData.name,
      notes: formData.notes,
      startAt: Date.now(),
    };
    const newRef = push(ref(rtdb, 'activeStreaks'));
    set(newRef, streak);
    setFormData({ name: '', notes: '' });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Show confirmation modal
  const handleResetClick = (streak) => {
    setStreakToReset(streak);
    setShowModal(true);
  };

  // Confirm reset streak
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

  return (
    <div className={`app-root ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
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
            <li><span className="icon">🔥</span>{!isCollapsed && <span>Active</span>}</li>
            <li><span className="icon">📜</span>{!isCollapsed && <span>History</span>}</li>
            <li><span className="icon">⚙️</span>{!isCollapsed && <span>Settings</span>}</li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        {showConfetti && <Confetti width={width} height={height} />}

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
                <button onClick={() => handleResetClick(s)}>Reset Streak</button>
              </div>
            ))}
          </section>
        )}

        {pastStreaks.length > 0 && (
          <section className="history-section">
            <h3>Past Streaks</h3>
            <ul>
              {pastStreaks.map((s, idx) => (
                <li key={idx}>
                  <strong>{s.name}</strong> — {Math.floor(s.durationMs / (1000 * 60 * 60 * 24))}d
                  <br />
                  <small>{new Date(s.startAt).toLocaleString()} → {new Date(s.endAt).toLocaleString()}</small>
                  {s.notes && <p>{s.notes}</p>}
                </li>
              ))}
            </ul>
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
