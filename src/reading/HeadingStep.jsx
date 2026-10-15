import { useState } from 'react';

/** Give the passage a heading in your own words. */
export default function HeadingStep({ session, onComplete }) {
  const [heading, setHeading] = useState('');
  const clean = heading.trim().replace(/\s+/g, ' ');

  return (
    <div className="ex ex-heading">
      <p className="ex-kicker">Sum it up</p>
      <h2 className="ex-question">Give {session.ref} a heading in your own words.</h2>
      <p className="ex-hint">What is it about? A few words is enough — it will name this passage on your map of the book.</p>
      <input
        className="input input-large heading-input"
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && clean && onComplete({ correct: 0, mistakes: 0, heading: clean })}
        placeholder="A few words…"
        maxLength={60}
        autoCapitalize="sentences"
        enterKeyHint="done"
      />
      <div className="ex-footer">
        <button className="btn btn-ghost" onClick={() => onComplete({ correct: 0, mistakes: 0, xp: 0 })}>
          Skip
        </button>
        <button className="btn btn-gold btn-wide" disabled={!clean} onClick={() => onComplete({ correct: 0, mistakes: 0, heading: clean })}>
          Save heading
        </button>
      </div>
    </div>
  );
}
