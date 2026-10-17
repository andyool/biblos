import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Corner } from '../components/Ornaments.jsx';
import { formatRef } from '../data/books.js';
import { fontFor } from '../data/shop.js';

// A verse as a picture to send or post: your theme's colours, your frame and your lettering.

const W = 1080;
const H = 1350;

function themeColours() {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  return { bg: v('--bg'), bg2: v('--bg-2'), ink: v('--ink'), faint: v('--ink-faint'), gold: v('--gold'), g1: v('--g1'), g2: v('--g2'), g3: v('--g3'), accent: v('--accent'), line: v('--line-strong') };
}

/** The frame's top-left corner, drawn from the same SVG as the app's frames. */
async function cornerImage(variant, c) {
  const div = document.createElement('div');
  const root = createRoot(div);
  flushSync(() => root.render(createElement(Corner, { variant, pos: 'tl', size: 62 })));
  const svg = div.innerHTML
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    .replace(/currentColor/g, c.gold)
    .replace(/url\(#gold-fill\)/g, c.g2)
    .replace(/var\(--accent\)/g, c.accent)
    .replace(/var\(--bg\)/g, c.bg);
  root.unmount();
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw the verse. Resolves to a PNG file. */
export async function verseImage({ id, tr, text, frame, verseFont }) {
  const c = themeColours();
  const font = fontFor(verseFont);
  const display = "'Cinzel', Georgia, serif";
  const script = "'Pinyon Script', cursive";
  await Promise.all([document.fonts.load(`500 40px ${font.family}`), document.fonts.load(`600 40px ${display}`), document.fonts.load(`40px ${script}`)]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Ground and border.
  const ground = ctx.createLinearGradient(0, 0, W, H);
  ground.addColorStop(0, c.bg2 || c.bg);
  ground.addColorStop(1, c.bg);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, W - 140, H - 140);

  // A corner in each corner, mirrored.
  const corner = await cornerImage(frame, c);
  const size = 200;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    ctx.save();
    ctx.translate(sx > 0 ? 44 : W - 44, sy > 0 ? 44 : H - 44);
    ctx.scale(sx, sy);
    ctx.drawImage(corner, 0, 0, size, size);
    ctx.restore();
  }

  const gold = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
  gold.addColorStop(0, c.g2);
  gold.addColorStop(0.45, c.g1);
  gold.addColorStop(1, c.g3);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // The reference, a small diamond, then the verse, as large as will fit.
  ctx.fillStyle = gold;
  ctx.font = `600 46px ${display}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
  ctx.fillText(formatRef(id).toUpperCase(), W / 2, 282);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.save();
  ctx.translate(W / 2, 330);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 1.5;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + dir * 26, 330);
    ctx.lineTo(W / 2 + dir * 150, 330);
    ctx.stroke();
  }

  // One pair of quotation marks: some verses begin or end inside a speech, with marks of their own.
  const quoted = `“${text.replace(/^[“"‘']+/, '').replace(/[”"’']+$/, '')}”`;
  const box = { top: 400, bottom: 1080, width: W - 300 };
  let px = 70;
  let lines;
  for (;; px -= 2) {
    ctx.font = `500 ${px * font.scale}px ${font.family}`;
    lines = wrap(ctx, quoted, box.width);
    if (lines.length * px * 1.42 <= box.bottom - box.top || px <= 30) break;
  }
  const lineHeight = px * 1.42;
  const maxLines = Math.floor((box.bottom - box.top) / lineHeight);
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1].replace(/[\s,;:.!?”]*$/, '')}…”`];
  const top = box.top + (box.bottom - box.top - lines.length * lineHeight) / 2 + px;
  ctx.fillStyle = c.ink;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, top + i * lineHeight));

  // The translation, and where it came from.
  ctx.fillStyle = c.faint;
  ctx.font = `600 28px ${display}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  ctx.fillText(tr, W / 2, 1150);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = gold;
  ctx.font = `46px ${script}`;
  ctx.fillText('Biblos', W / 2, 1226);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const name = `${formatRef(id).replace(/[^\w\s–-]/g, '').replace(/\s+/g, '-')}-${tr}.png`;
  return new File([blob], name, { type: 'image/png' });
}
