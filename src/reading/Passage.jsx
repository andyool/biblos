import { renderWord } from '../components/VerseText.jsx';

/** A passage for reading: one verse to a line, numbered in the margin. */
export default function Passage({ verses, className = '' }) {
  return (
    <div className={`passage ${className}`}>
      {verses.map((v) => (
        <p key={v.v} className="passage-verse">
          <sup className="verse-num">{v.v}</sup>
          {renderWord(v.t)}
        </p>
      ))}
    </div>
  );
}
