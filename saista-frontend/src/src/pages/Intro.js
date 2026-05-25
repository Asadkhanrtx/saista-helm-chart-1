import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Intro.css';

const Intro = () => {
  const [phase, setPhase] = useState('candle');  // candle → countdown → done
  const [count, setCount] = useState(3);
  const [blown, setBlown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('introPlayed')) {
      navigate('/home');
      return;
    }
    // Show candle for 1.5s then start countdown
    const t1 = setTimeout(() => setPhase('countdown'), 1500);
    return () => clearTimeout(t1);
  }, [navigate]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      setBlown(true);
      sessionStorage.setItem('introPlayed', 'true');
      setTimeout(() => navigate('/home'), 800);
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 900);
    return () => clearTimeout(t);
  }, [phase, count, navigate]);

  return (
    <div className={`intro-screen ${blown ? 'blown' : ''}`}>
      <div className="stars">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="star" style={{ '--delay': `${Math.random() * 3}s`, '--x': `${Math.random() * 100}%`, '--y': `${Math.random() * 100}%` }} />
        ))}
      </div>

      <div className="cake-scene">
        {/* Cake */}
        <div className="cake">
          <div className="cake-top" />
          <div className="cake-middle" />
          <div className="cake-bottom" />

          {/* Candles */}
          <div className="candles">
            {[1,2,3].map(i => (
              <div key={i} className="candle-wrap">
                <div className="candle" />
                <div className={`flame ${blown ? 'out' : ''}`}>
                  <div className="flame-inner" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Text */}
        {phase === 'candle' && (
          <div className="intro-text animate-in">
            <h1>🎂 Saista Bakers</h1>
            <p>Blow the candle...</p>
          </div>
        )}

        {phase === 'countdown' && !blown && (
          <div className="countdown-wrap">
            <span className="countdown-number" key={count}>{count}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Intro;
