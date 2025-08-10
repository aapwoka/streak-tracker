import "./App.css"
import React, { useState, useEffect } from "react";
import { ref, push, onValue, set } from "firebase/database";
import { rtdb } from "./firebase"; // your firebase config

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formData, setFormData] = useState({ name: "", notes: "" });
  const [activeStreaks, setActiveStreaks] = useState([]);
  const [pastStreaks, setPastStreaks] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Load active streaks
  useEffect(() => {
    const activeRef = ref(rtdb, "activeStreaks");
    return onValue(activeRef, (snap) => {
      const data = snap.val();
      if (data) {
        setActiveStreaks(
          Object.entries(data).map(([id, streak]) => ({ id, ...streak }))
        );
      } else {
        setActiveStreaks([]);
      }
    });
  }, []);

  // Load past streaks
  useEffect(() => {
    const pastRef = ref(rtdb, "pastStreaks");
    return onValue(pastRef, (snap) => {
      const data = snap.val();
      if (data) {
        setPastStreaks(
          Object.values(data).sort((a, b) => b.endAt - a.endAt)
        );
      } else {
        setPastStreaks([]);
      }
    });
  }, []);

  // Handle starting new streak
  const handleStart = () => {
    if (!formData.name.trim()) return alert("Please name your streak");

    const streak = {
      name: formData.name,
      notes: formData.notes,
      startAt: Date.now(),
    };

    push(ref(rtdb, "activeStreaks"), streak);
    setFormData({ name: "", notes: "" });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Handle reset (moves to past streaks)
  const handleReset = (id) => {
    const streak = activeStreaks.find((s) => s.id === id);
    if (!streak) return;

    const endedStreak = {
      ...streak,
      endAt: Date.now(),
      durationMs: Date.now() - streak.startAt,
    };

    push(ref(rtdb, "pastStreaks"), endedStreak);
    set(ref(rtdb, `activeStreaks/${id}`), null);
  };

  // Time formatter
  const formatDuration = (ms) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className={`app-root ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <button
            className="toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            ☰
          </button>
          {!sidebarCollapsed && <h2>Streaks</h2>}
        </div>
        <nav>
          <ul>
            <li><span className="icon">🏠</span> {!sidebarCollapsed && "Home"}</li>
            <li><span className="icon">🔥</span> {!sidebarCollapsed && "Current"}</li>
            <li><span className="icon">📜</span> {!sidebarCollapsed && "History"}</li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Form */}
        <section className="form-section">
          <h3>Start a New Streak</h3>
          <input
            type="text"
            placeholder="Streak name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
          <textarea
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
          <button onClick={handleStart}>Start</button>
        </section>

        {/* Active Streaks */}
        {activeStreaks.length > 0 && (
          <section className="active-section">
            <h3>🔥 Current Streaks</h3>
            {activeStreaks.map((streak) => {
              const diff = Date.now() - streak.startAt;
              return (
                <div key={streak.id} className="streak-card">
                  <h4>{streak.name}</h4>
                  {streak.notes && <p>{streak.notes}</p>}
                  <p>{formatDuration(diff)}</p>
                  <button onClick={() => handleReset(streak.id)}>Reset</button>
                </div>
              );
            })}
          </section>
        )}

        {/* Past Streaks */}
        {pastStreaks.length > 0 && (
          <section className="history-section">
            <h3>📜 Past Streaks</h3>
            {pastStreaks.map((streak, i) => (
              <div key={i} className="streak-card">
                <h4>{streak.name}</h4>
                {streak.notes && <p>{streak.notes}</p>}
                <p>
                  {formatDuration(streak.durationMs)} (Ended:{" "}
                  {new Date(streak.endAt).toLocaleString()})
                </p>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
