import Sheet from '../components/Sheet.jsx';
import { EmblemBadge } from '../components/Ornaments.jsx';
import Glyph from '../components/Glyph.jsx';
import { useStore } from '../lib/store.js';
import { allPaths } from '../data/paths.js';
import { setActivePath } from '../lib/actions.js';

export function PathList({ onPick, active }) {
  const state = useStore();
  return (
    <div className="path-list">
      {allPaths(state).map((p) => {
        const done = p.verses.filter((id) => (state.verses[id]?.level || 0) >= 4).length;
        const started = p.verses.filter((id) => (state.verses[id]?.level || 0) >= 1).length;
        return (
          <button key={p.id} className={`path-item ${active === p.id ? 'is-active' : ''}`} onClick={() => onPick(p.id)}>
            <EmblemBadge id={p.emblem} size={44} />
            <span className="path-item-text">
              <strong>{p.title}</strong>
              <small>
                {p.subtitle} · {p.verses.length} verse{p.verses.length === 1 ? '' : 's'}
              </small>
              <span className="mini-bar">
                <span style={{ width: `${(started / Math.max(1, p.verses.length)) * 100}%` }} className="mini-bar-started" />
                <span style={{ width: `${(done / Math.max(1, p.verses.length)) * 100}%` }} className="mini-bar-done" />
              </span>
            </span>
            {active === p.id ? <Glyph name="check" size={18} /> : <Glyph name="chevron" size={18} />}
          </button>
        );
      })}
    </div>
  );
}

export default function PathsSheet({ onClose }) {
  const active = useStore((s) => s.settings.activePath);
  return (
    <Sheet title="Choose a path" onClose={onClose}>
      <PathList
        active={active}
        onPick={(id) => {
          setActivePath(id);
          onClose();
        }}
      />
    </Sheet>
  );
}
