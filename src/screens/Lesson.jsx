import { useMemo, useState } from 'react';
import Glyph from '../components/Glyph.jsx';
import { ask } from '../lib/ui.js';
import { play } from '../lib/sound.js';
import { relearnStep, stepXp } from '../lib/lesson.js';
import { pick } from '../lib/text.js';
import { stopSpeaking } from '../lib/speech.js';
import { useBack } from '../lib/nav.js';
import ReadStep from '../exercises/ReadStep.jsx';
import OrderStep from '../exercises/OrderStep.jsx';
import ClozeStep from '../exercises/ClozeStep.jsx';
import BankStep from '../exercises/BankStep.jsx';
import LettersStep from '../exercises/LettersStep.jsx';
import ReferenceStep from '../exercises/ReferenceStep.jsx';
import GlimpseStep from '../exercises/GlimpseStep.jsx';
import PairsStep from '../exercises/PairsStep.jsx';
import ChainStep from '../exercises/ChainStep.jsx';
import SlipStep from '../exercises/SlipStep.jsx';
import SortStep from '../exercises/SortStep.jsx';
import OpeningStep from '../exercises/OpeningStep.jsx';
import RushStep from '../exercises/RushStep.jsx';
import SpellStep from '../exercises/SpellStep.jsx';
import { ACTIVITY_NAMES, SKILLS } from '../lib/adapt.js';

const EXERCISES = {
  read: ReadStep,
  order: OrderStep,
  cloze: ClozeStep,
  bank: BankStep,
  letters: LettersStep,
  link: LettersStep,
  reference: ReferenceStep,
  glimpse: GlimpseStep,
  pairs: PairsStep,
  chain: ChainStep,
  slip: SlipStep,
  sort: SortStep,
  opening: OpeningStep,
  rush: RushStep,
  spell: SpellStep,
};

const PRAISE = {
  perfect: ['Excellent!', 'Beautifully done!', 'Flawless!', 'Splendid!', 'Well done!', 'Wonderful!'],
  good: ['Well remembered', 'Nearly flawless', 'Good work', 'Very good'],
  learning: ['Keep pressing on', 'Line upon line', 'Little by little', 'It will come'],
};

const REDO_TYPES = new Set(['letters', 'bank', 'order', 'glimpse', 'spell']);

// How hard a step is. Reading, references, joins and sorting are other skills, so they have none.
function difficulty(s) {
  if (s.type === 'letters') return s.hint === 'blank' ? 4 : s.hint === 'partial' ? 3 : 2;
  return { order: 1, cloze: 1, pairs: 1, glimpse: 1, bank: 2, chain: 2, slip: 3, spell: 3, rush: 3 }[s.type] ?? null;
}

/**
 * Where to go after a step. While every answer in a lesson has been flawless, steps easier
 * than the hardest one done so far are skipped (never the last).
 */
function nextIndex(session, queue, from, results) {
  if (session.kind !== 'learn') return from;
  const graded = results.filter((r) => difficulty(r) !== null);
  if (!graded.length || graded.some((r) => r.mistakes > 0)) return from;
  const best = Math.max(...graded.map(difficulty));
  let i = from;
  while (i < queue.length - 1 && !queue[i].redo && difficulty(queue[i]) !== null && difficulty(queue[i]) < best) i += 1;
  return i;
}

export default function Lesson({ session, onExit, onFinish }) {
  const [queue, setQueue] = useState(session.steps);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [combo, setCombo] = useState(0);
  const step = queue[index];
  const tokens = step.tokens || session.tokens[step.verseId];
  const Exercise = EXERCISES[step.type];
  const redos = queue.filter((s) => s.redo).length;
  const relearns = queue.filter((s) => s.relearn).length;

  const progress = (index + (feedback ? 1 : 0)) / queue.length;
  const subtitle = useMemo(() => {
    if (session.kind === 'review') return 'Review';
    if (session.kind === 'recite') return 'Recitation';
    if (session.kind === 'practice') return 'Practice';
    return `Lesson ${(session.levels[session.verseIds[0]] || 0) + 1} of 4`;
  }, [session]);

  const finish = (all) => onFinish(all);

  const complete = (result) => {
    const r = { ...result, type: step.type, hint: step.hint, verseId: step.verseId, xp: stepXp(step) + (result.bonus || 0), relearn: step.relearn, redo: step.redo };
    const all = [...results, r];
    setResults(all);
    if (step.type === 'read') {
      const after = nextIndex(session, queue, index + 1, all);
      if (after >= queue.length) finish(all);
      else setIndex(after);
      return;
    }
    let nextQueue = queue;
    if (result.mistakes >= 2 && REDO_TYPES.has(step.type) && !step.redo && redos < 2 && session.kind === 'learn') {
      nextQueue = [...queue, { ...step, redo: true, key: `${step.key}-again` }];
    } else if (result.mistakes >= 3 && step.type === 'letters' && !step.relearn && relearns < 2 && (session.kind === 'review' || session.kind === 'practice')) {
      // A poor recall in a review: once more straight away, with half the words showing.
      nextQueue = [...queue, relearnStep(step, tokens)];
    }
    if (nextQueue !== queue) setQueue(nextQueue);
    const after = nextIndex(session, nextQueue, index + 1, all);
    const tone = result.mistakes === 0 ? 'perfect' : result.mistakes <= 2 && result.correct > 0 ? 'good' : 'learning';
    setCombo((c) => (tone === 'perfect' ? c + 1 : 0));
    if (tone !== 'learning') play('correct');
    setFeedback({ tone, title: result.swift ? 'Swift and sure!' : pick(PRAISE[tone]), result: r, after, last: after >= nextQueue.length });
  };

  const next = () => {
    const { last, after } = feedback;
    setFeedback(null);
    if (last) finish(results);
    else setIndex(after);
  };

  const exit = async () => {
    const ok = await ask({ title: 'Leave this lesson?', message: 'Your progress in this lesson will not be saved.', confirm: 'Leave', cancel: 'Keep going' });
    if (ok) {
      stopSpeaking();
      onExit();
    }
  };
  useBack(exit, { guard: true });

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
      <div className="lesson-sub">
        {step.redo ? (
          'Once more, to make it stick'
        ) : step.relearn ? (
          'Once more, with a little help'
        ) : step.isNew ? (
          <span className="lesson-new">New · {ACTIVITY_NAMES[step.type]}</span>
        ) : step.focus ? (
          <>
            {subtitle} · <span className="lesson-focus">Focus: {SKILLS[step.focus].name}</span>
          </>
        ) : (
          subtitle
        )}
      </div>

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
                  {feedback.result.bonus > 0 && ` (${feedback.result.bonus} for speed)`}
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
