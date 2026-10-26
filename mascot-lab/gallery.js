import { mount } from '/src/mascot/engine.js';
import { CLIPS, BASES } from '/src/mascot/clips.js';

const fit = (c) => { c.width = c.clientWidth * 2; c.height = c.clientHeight * 2; return c; };
const lambs = [mount(fit(document.getElementById('f')), { variant: 'female' }), mount(fit(document.getElementById('m')), { variant: 'male' })];
const bar = (id, names, fn) => {
  const el = document.getElementById(id);
  for (const n of names) {
    const b = document.createElement('button');
    b.textContent = n;
    b.onclick = () => fn(n, b, el);
    el.append(b);
  }
};
bar('bases', Object.keys(BASES), (n, b, el) => {
  el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  lambs.forEach((l) => l.setBase(n));
});
bar('clips', Object.keys(CLIPS), (n) => lambs.forEach((l) => l.play(n)));
