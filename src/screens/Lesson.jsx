import { useMemo, useState } from 'react';
import Glyph from '../components/Glyph.jsx';
import { ask } from '../lib/ui.js';
import { play } from '../lib/sound.js';
import { stepXp } from '../lib/lesson.js';
import { pick } from '../lib/text.js';
import { stopSpeaking } from '../lib/speech.js';
import ReadStep from '../exercises/ReadStep.jsx';
import OrderStep from '../exercises/OrderStep.jsx';
import ClozeStep from '../exercises/ClozeStep.jsx';
import BankStep from '../exercises/BankStep.jsx';
import LettersStep from '../exercises/LettersStep.jsx';
import ReferenceStep from '../exercises/ReferenceStep.jsx';

const EXERCISES = { read: ReadStep, order: OrderStep, cloze: ClozeStep, bank: BankStep, letters: LettersStep, reference: ReferenceStep };

const PRAISE = {
  perfect: ['Excellent!', 'Beautifully done!', 'Flawless!', 'Splendid!', 'Well done!', 'Wonderful!'],
  good: ['Well remembered', 'Nearly flawless', 'Good work', 'Very good'],
  learning: ['Keep pressing on', 'Line upon line', 'Little by little', 'It will come'],
};

const REDO_TYPES = new Set(['letters', 'bank', 'order']);

export default function Lesson({ session, onExit, onFinish }) {
  const [queue, setQueue] = useState(session.steps);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [combo, setCombo] = useState(0);
  const step = queue[index];
  const tokens = session.tokens[step.verseId];
  const Exercise = EXERCISES[step.type];
  const redos = queue.filter((s) => s.redo).length;

  const progress = (index + (feedback ? 1 : 0)) / queue.length;
  const subtitle = useMemo(() => {
    if (session.kind === 'review') return 'Review';
    if (session.kind === 'recite') return 'Recitation';
    if (session.kind === 'practice') return 'Practice';
    return `Lesson ${(session.levels[session.verseIds[0]] || 0) + 1} of 4`;
  }, [session]);

  const finish = (all) => onFinish(all);

  const complete = (result) => {
    const r = { ...result, type: step.type, hint: step.hint, verseId: step.verseId, xp: stepXp(step) };
    const all = [...results, r];
    setResults(all);
    if (step.type === 'read') {
      if (index + 1 >= queue.length) finish(all);
      else setIndex(index + 1);
      return;
    }
    let nextQueue = queue;
    if (result.mistakes >= 2 && REDO_TYPES.has(step.type) && !step.redo && redos < 2 && session.kind === 'learn') {
      nextQueue = [...queue, { ...step, redo: true, key: `${step.key}-again` }];
      setQueue(nextQueue);
    }
    const tone = result.mistakes === 0 ? 'perfect' : result.mistakes <= 2 ? 'good' : 'learning';
    setCombo((c) => (tone === 'perfect' ? c + 1 : 0));
    if (tone !== 'learning') play('correct');
    setFeedback({ tone, title: pick(PRAISE[tone]), result: r, last: index + 1 >= nextQueue.length });
  };

  const next = () => {
    const last = feedback.last;
    setFeedback(null);
    if (last) finish(results);
    else setIndex(index + 1);
  };

  const exit = async () => {
    const ok = await ask({ title: 'Leave this lesson?', message: 'Your progress in this lesson will not be saved.', confirm: 'Leave', cancel: 'Keep going' });
    if (ok) {
      stopSpeaking();
      onExit();
    }
  };

  return (
    <div className="lesson">
      <header className="lesson-head">
        <button className="icon-btn" onClick={exit} aria-label="Leave lesson">
          <Glyph name="close" size={22} />
        </button>
        <div className="lesson-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="lesson-progress-fill" style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
        <div className={`combo ${combo >= 2 ? 'is-on' : ''}`} aria-hidden={combo < 2}>
          <Glyph name="flame" size={16} />
          {combo}
        </div>
      </header>
      <div className="lesson-sub">{step.redo ? 'Once more, to make it stick' : subtitle}</div>

      <main className="lesson-body" key={step.key}>
        <Exercise step={step} tokens={tokens} tr={session.trs[step.verseId]} locked={!!feedback} onComplete={complete} />
      </main>

      {feedback && (
        <div className={`feedback is-${feedback.tone}`} role="status">
          <div className="feedback-inner">
            <div className="feedback-head">
              <span className="feedback-icon">
                <Glyph name={feedback.tone === 'learning' ? 'seed' : 'check'} size={22} strokeWidth={2} />
              </span>
              <div>
                <h3 className="feedback-title">{feedback.title}</h3>
                <p className="feedback-sub">
                  +{feedback.result.xp} XP
                  {feedback.result.mistakes > 0 && ` · ${feedback.result.mistakes} slip${feedback.result.mistakes === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
            <button className="btn btn-gold btn-block" onClick={next} autoFocus>
              {feedback.last ? 'Finish' : 'Continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
