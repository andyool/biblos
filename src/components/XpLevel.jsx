import { useEffect, useMemo, useState } from 'react';
import { xpLevel } from '../data/levels.js';
import { play } from '../lib/sound.js';
import { Sparkles } from './Ornaments.jsx';

/** A gold medallion with the level on it. */
function LevelMedal({ level, size = 46, className = '' }) {
  return (
    <span className={`level-medal ${className}`} style={{ width: size, height: size, fontSize: size * (level > 99 ? 0.34 : 0.44) }}>
      {level}
    </span>
  );
}

/** Your level and the XP still to go to the next, for the profile. */
export function LevelBar({ xp }) {
  const { level, into, span } = xpLevel(xp);
  return (
    <div className="level-bar">
      <LevelMedal level={level} size={40} />
      <div className="level-bar-text">
        <div className="level-bar-head">
          <strong>Level {level}</strong>
          <small>
            {(span - into).toLocaleString()} XP to level {level + 1}
          </small>
        </div>
        <span className="mini-bar is-wide">
          <span className="mini-bar-done" style={{ width: `${(into / span) * 100}%` }} />
        </span>
      </div>
    </div>
  );
}

/**
 * After a lesson: the bar fills with the XP just earned. Reaching a level, it fills to the end,
 * the new level is struck on the medal and the bar starts again.
 */
export function LevelProgress({ xp, totalXp, levelUp }) {
  const before = xpLevel(totalXp - xp);
  const after = xpLevel(totalXp);
  // 0: as it was, 1: filling, 2: the new level, 3: filling the new level.
  const [phase, setPhase] = useState(0);
  // Made once, so the sparks keep their course while the bar moves on.
  const burst = useMemo(() => <Sparkles count={18} />, []);

  useEffect(() => {
    const timers = [setTimeout(() => setPhase(1), 700)];
    if (levelUp) {
      timers.push(
        setTimeout(() => {
          setPhase(2);
          play('level');
        }, 1700),
        setTimeout(() => setPhase(3), 1800),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reached = levelUp && phase >= 2;
  const shown = phase >= (levelUp ? 2 : 1) ? after : before;
  const fill = phase === 0 ? before.into / before.span : phase === 1 ? (levelUp ? 1 : after.into / after.span) : phase === 2 ? 0 : after.into / after.span;

  return (
    <div className={`level-progress ${reached ? 'is-up' : ''}`}>
      {reached && burst}
      <LevelMedal key={shown.level} level={shown.level} size={52} className={reached ? 'is-new' : ''} />
      <div className="level-bar-text">
        <div className="level-bar-head">
          <strong>{reached ? `Level ${after.level} reached` : `Level ${shown.level}`}</strong>
          <small>{reached ? `+${levelUp.talents} talents` : `${(shown.span - shown.into).toLocaleString()} XP to level ${shown.level + 1}`}</small>
        </div>
        <span className="mini-bar is-wide">
          <span className={`mini-bar-done ${phase === 2 ? '' : 'is-filling'}`} style={{ width: `${fill * 100}%` }} />
        </span>
      </div>
    </div>
  );
}
