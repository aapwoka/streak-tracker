import './App.css';
import { useEffect, useState } from 'react';
import { ref, set, push, onValue, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';

function App() {
  const [activeStreak, setActiveStreak] = useState(null);
  const [pastStreaks, setPastStreaks] = useState([]);
  const [formData, setFormData] = useState({ name: '', notes: '' });
  const [elapsed, setElapsed] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [width, height] = useWindowSize();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load active streak
  useEffect(() => {
    const activeRef = ref(rtdb, 'activeStreak');
    const unsub = onValue(activeRef, (snap) => {
      const data = snap.val();
      setActiveStreak(data || null);
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

  // Update elapsed timer
  useEffect(() => {
    let interval;
    if (activeStreak?.startAt) {
      const updateElapsed = () => {
        const now = Date.now();
        const diff = now - activeStreak.startAt;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsed({ days, hours, minutes, seconds });
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    return () => clearInterval(interval);
  }, [activeStreak]);

  // Start new streak
  const handleStart = () => {
    if (!formData.name.trim()) return alert('Please name your streak');
    const streak = {
      name: formData.name,
      notes: formData.notes,
      startAt: Date.now(),
    };
    set(ref(rtdb, 'activeStreak'), streak);
    setFormData({ name: '', notes: '' });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Reset streak → move to history
  const handleReset = () => {
    if (!activeStreak) return;
    const endedStreak = {
      ...activeStreak,
      endAt: Date.now(),
      durationMs: Date.now() - activeStreak.startAt,
    };
    push(ref(rtdb, 'pastStreaks'), endedStreak);
    set(ref(rtdb, 'activeStreak'), null);
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

        {!activeStreak && (
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
        )}

        {activeStreak && (
          <section className="active-section">
            <h3>🔥 {activeStreak.name}</h3>
            {activeStreak.notes && <p>{activeStreak.notes}</p>}
            <p>
              {elapsed.days}d {elapsed.hours}h {elapsed.minutes}m {elapsed.seconds}s
            </p>
            <button onClick={handleReset}>Reset Streak</button>
          </section>
        )}

        {pastStreaks.length > 0 && (
          <section className="history-section">
            <h3>Past Streaks</h3>
            <ul>
              {pastStreaks.map((s, idx) => (
                <li key={idx}>
                  <strong>{s.name}</strong> — {Math.floor(s.durationMs / (1000*60*60*24))}d  
                  <br />
                  <small>{new Date(s.startAt).toLocaleString()} → {new Date(s.endAt).toLocaleString()}</small>
                  {s.notes && <p>{s.notes}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
