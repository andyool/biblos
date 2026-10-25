import { useState } from 'react';
import Glyph from '../components/Glyph.jsx';
import Sheet from '../components/Sheet.jsx';
import { ask } from '../lib/ui.js';
import { play } from '../lib/sound.js';
import { pick } from '../lib/text.js';
import { stopSpeaking } from '../lib/speech.js';
import { useBack } from '../lib/nav.js';
import { readingXp } from '../lib/reading.js';
import Passage from '../reading/Passage.jsx';
import PassageStep from '../reading/PassageStep.jsx';
import ChoiceStep from '../reading/ChoiceStep.jsx';
import SequenceStep from '../reading/SequenceStep.jsx';
import ReflectStep from '../reading/ReflectStep.jsx';
import PortionStep from '../reading/PortionStep.jsx';
import Woolly from '../components/Woolly.jsx';
import { feedbackAct } from '../mascot/reactions.js';

const STEPS = { passage: PassageStep, question: ChoiceStep, summary: ChoiceStep, flow: SequenceStep, recap: SequenceStep, reflect: ReflectStep, portion: PortionStep };
const GRADED = new Set(['question', 'summary', 'flow', 'recap']);

const PRAISE = {
  perfect: ['Well understood', 'Exactly so', 'Just right', 'Well seen', 'Rightly read'],
  good: ['That’s it', 'Got there', 'Well found'],
  learning: ['Read it again', 'Line upon line', 'Keep looking', 'Now you know'],
};

/** One reading: the passage, then questions on its meaning, then reflection. Or a day's passages in a plan, just to read. */
export default function Reading({ session, onExit, onFinish }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [lookAgain, setLookAgain] = useState(false);
  // How far down a day's reading you have scrolled.
  const [scrolled, setScrolled] = useState(0);
  const step = session.steps[index];
  const Step = STEPS[step.type];
  const last = index + 1 >= session.steps.length;
  const passageAt = session.steps.findIndex((s) => s.type === 'passage');
  const passageSeen = passageAt >= 0 && passageAt < index;
  const progress = session.plain ? scrolled : (index + (feedback ? 1 : 0)) / session.steps.length;

  const advance = (all) => {
    if (last) onFinish(all);
    else setIndex(index + 1);
  };

  const complete = (result) => {
    const r = { ...result, type: step.type, xp: result.xp ?? step.xp ?? readingXp(step.type) };
    const all = [...results, r];
    setResults(all);
    if (!GRADED.has(step.type)) return advance(all);
    const tone = result.mistakes === 0 ? 'perfect' : result.mistakes <= 1 ? 'good' : 'learning';
    if (tone !== 'learning') play('correct');
    setFeedback({ tone, title: pick(PRAISE[tone]), xp: r.xp, mistakes: result.mistakes, why: step.why });
  };

  const next = () => {
    setFeedback(null);
    advance(results);
  };

  const exit = async () => {
    const ok = !results.length || (await ask({ title: 'Stop reading?', message: 'Your place in the book is kept — this passage will be waiting.', confirm: 'Stop', cancel: 'Keep reading', woolly: 'encourage' }));
    if (ok) {
      stopSpeaking();
      onExit();
    }
  };
  useBack(exit, { guard: true });

  return (
    <div className="lesson reading">
      <header className="lesson-head">
        <button className="icon-btn" onClick={exit} aria-label="Stop reading">
          <Glyph name="close" size={22} />
        </button>
        <div className="lesson-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="lesson-progress-fill" style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
        <button className={`icon-btn ${passageSeen ? '' : 'is-hidden'}`} onClick={() => setLookAgain(true)} disabled={!passageSeen} aria-label="Look at the passage again">
          <Glyph name="book" size={22} />
        </button>
      </header>
      <div className="lesson-sub">{session.ref}</div>

      <main className="lesson-body" key={step.key}>
        <Step step={step} session={session} locked={!!feedback} onComplete={complete} onProgress={setScrolled} />
      </main>

      {feedback && (
        <div className={`feedback is-${feedback.tone}`} role="status">
          <div className="feedback-inner">
            <Woolly act={feedbackAct(feedback.tone)} size={118} peek delay={200} className="feedback-woolly" />
            <div className="feedback-head">
              <span className="feedback-icon">
                <Glyph name={feedback.tone === 'learning' ? 'seed' : 'check'} size={22} strokeWidth={2} />
              </span>
              <div>
                <h3 className="feedback-title">{feedback.title}</h3>
                <p className="feedback-sub">
                  +{feedback.xp} XP
                  {feedback.mistakes > 0 && ` · ${feedback.mistakes} slip${feedback.mistakes === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
            {feedback.why && <p className="feedback-why">{feedback.why}</p>}
            <button className="btn btn-gold btn-block" onClick={next} autoFocus>
              {last ? 'Finish' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {lookAgain && (
        <Sheet title={session.ref} onClose={() => setLookAgain(false)} className="passage-sheet">
          <Passage verses={session.verses} />
        </Sheet>
      )}
    </div>
  );
}
