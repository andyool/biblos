import { Divider } from '../components/Ornaments.jsx';
import { setReadingBook, updateProfile, updateSettings } from '../lib/actions.js';
import { play } from '../lib/sound.js';
import Woolly from '../components/Woolly.jsx';

// Everything a new user would otherwise be asked starts with a good default, and each can be
// changed where it comes up: the Bible from the Today card or Me, the path from Paths, the book
// from Read, the goal and Woolly under Me.
const START = { translation: 'ESV', dailyGoal: 20, activePath: 'foundations', focus: 'both' };
const FIRST_BOOK = 'MRK';

export default function Onboarding() {
  const begin = () => {
    updateProfile({ since: Date.now() });
    updateSettings({ ...START, onboarded: true });
    setReadingBook(FIRST_BOOK);
    play('complete');
  };

  return (
    <div className="onboarding">
      <div className="ob-page ob-welcome">
        <Woolly size={176} intro="welcome" delay={350} className="ob-woolly" />
        <h1 className="logo-word gold-text">Biblos</h1>
        <Divider width={230} />
        <p className="ob-tag">Hide God’s word in your heart — a few minutes at a time.</p>
        <blockquote className="ob-quote">
          “I have hidden your word in my heart, that I might not sin against you.”
          <cite>Psalm 119:11 (WEB)</cite>
        </blockquote>
        <button className="btn btn-gold btn-block btn-shine" onClick={begin}>
          Begin
        </button>
      </div>
    </div>
  );
}
