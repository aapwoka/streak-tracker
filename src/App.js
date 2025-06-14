import './App.css';
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from './firebase';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size' // optional helper

function App() {
  const [streak, setStreak] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showConfetti] = useState(true);
  const [width, height] = useWindowSize(); // for fullscreen confetti

  useEffect(() => {
    const dbRef = ref(rtdb, 'startdate');
    let interval;

    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.streakStartStatus?.startAt) {
        const startAt = new Date(data.streakStartStatus.startAt).getTime();

        const updateStreak = () => {
          const now = Date.now();
          const diff = now - startAt;

          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          setStreak({ days, hours, minutes, seconds });
        };

        updateStreak();
        interval = setInterval(updateStreak, 1000);
      }
    });

    return () => clearInterval(interval);
  }, []);

  // Auto hide confetti after 5 seconds
  //useEffect(() => {
    //const timer = setTimeout(() => setShowConfetti(false), 5000);
    //return () => clearTimeout(timer);
  //}, []);

  return (
    <div className="App">
      <header className="App-header">

        {/* 🎉 Confetti */}
        {showConfetti && <Confetti width={width} height={height} />}

        <h3>Keep going</h3>
        <p>
          Your Streak is {streak.days} day{streak.days !== 1 ? 's' : ''}{' '}
          {streak.hours} hour{streak.hours !== 1 ? 's' : ''}{' '}
          {streak.minutes} minute{streak.minutes !== 1 ? 's' : ''}{' '}
          {streak.seconds} second{streak.seconds !== 1 ? 's' : ''}
        </p>

      </header>
    </div>
  );
}

export default App;
