import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { useStore } from '../lib/store.js';
import { PLANS } from '../data/plans.js';
import { getTranslation } from '../data/translations.js';
import { versesInBook } from '../lib/plans.js';
import { leavePlan, startPlan } from '../lib/actions.js';
import { ask, toast } from '../lib/ui.js';
import { cueSoon } from '../mascot/bus.js';

/** Choose a reading plan: a pace through Read Through, book after book. */
export default function PlansSheet({ onClose }) {
  const current = useStore((s) => s.reading.plan?.id);
  const catholic = useStore((s) => Boolean(getTranslation(s.settings.translation).catholic));

  const choose = async (plan) => {
    if (plan.id === current) return onClose();
    if (current) {
      const ok = await ask({ title: `Start ${plan.name.replace(/^The /, 'the ')}?`, message: 'You will stop following your current plan. Everything you have read stays read.', confirm: 'Start', woolly: 'think' });
      if (!ok) return undefined;
    }
    startPlan(plan.id);
    toast(`${plan.name} begins today`, 'calendar');
    cueSoon('plan');
    return onClose();
  };

  const leave = async () => {
    const ok = await ask({ title: 'Stop following this plan?', message: 'Everything you have read stays read, and you can start a plan again any time.', confirm: 'Stop', danger: true });
    if (ok) {
      leavePlan();
      onClose();
    }
  };

  return (
    <Sheet title="Reading plans" onClose={onClose} woolly="present">
      <p className="small-print">A steady pace through the books. What you’ve already read counts.</p>
      <div className="path-list">
        {PLANS.map((plan) => {
          const verses = plan.books(catholic).reduce((sum, code) => sum + versesInBook(code, catholic), 0);
          return (
            <button key={plan.id} className={`path-item ${current === plan.id ? 'is-active' : ''}`} onClick={() => choose(plan)}>
              <Glyph name="calendar" size={30} />
              <span className="path-item-text">
                <strong>{plan.name}</strong>
                <small>
                  {plan.desc} · about {Math.round(verses / plan.days)} verses a day
                </small>
              </span>
              <Glyph name={current === plan.id ? 'check' : 'chevron'} size={18} />
            </button>
          );
        })}
      </div>
      {current && (
        <div className="sheet-actions">
          <button className="btn btn-ghost btn-block btn-danger-text" onClick={leave}>
            Stop following this plan
          </button>
        </div>
      )}
    </Sheet>
  );
}
