import { getState } from './store.js';
import { speakable } from './text.js';

let voice = null;

function chooseVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const preferred = ['Daniel', 'Arthur', 'Serena', 'Moira', 'Karen', 'Samantha', 'Google UK English Male', 'Google UK English Female'];
  voice = preferred.map((name) => english.find((v) => v.name.startsWith(name))).find(Boolean) || english.find((v) => v.lang === 'en-GB') || english[0] || null;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  chooseVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', chooseVoice);
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text, { onEnd } = {}) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(speakable(text));
  if (voice) u.voice = voice;
  u.rate = getState().settings.speechRate || 0.92;
  u.pitch = 1;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
