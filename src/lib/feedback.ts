import confetti from 'canvas-confetti';

const MUTE_KEY = 'feedback_muted';

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted: boolean) {
  if (muted) localStorage.setItem(MUTE_KEY, '1');
  else localStorage.removeItem(MUTE_KEY);
}

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    const AC =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function tone(
  freq: number,
  duration = 0.18,
  type: OscillatorType = 'sine',
  volume = 0.18,
  attack = 0.005,
  decay = 0.05,
) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = c.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.linearRampToValueAtTime(volume * 0.6, now + attack + decay);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

/** 答对：清脆「叮~」上行三音 */
export function correctSound() {
  if (isMuted()) return;
  // E5 → G5 → C6 短促上行
  tone(659.25, 0.12, 'sine', 0.15);
  setTimeout(() => tone(783.99, 0.12, 'sine', 0.15), 80);
  setTimeout(() => tone(1046.5, 0.22, 'sine', 0.18), 160);
}

/** 答错：低沉「嘟」 */
export function wrongSound() {
  if (isMuted()) return;
  tone(220, 0.18, 'sawtooth', 0.12);
  setTimeout(() => tone(165, 0.28, 'sawtooth', 0.1), 100);
}

/** 完成全卷：庆祝小号上行 */
export function finishSound() {
  if (isMuted()) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    setTimeout(() => tone(f, 0.16, 'triangle', 0.18), i * 110);
  });
  setTimeout(() => tone(1318.5, 0.4, 'triangle', 0.2), notes.length * 110);
}

/** 答对：小型彩带 */
export function correctConfetti() {
  confetti({
    particleCount: 60,
    spread: 60,
    startVelocity: 38,
    origin: { y: 0.7 },
    colors: ['#3b82f6', '#6366f1', '#a855f7', '#22c55e', '#fbbf24'],
    scalar: 0.9,
    disableForReducedMotion: true,
  });
}

/** 完成全卷：左右双侧大爆发 */
export function finishConfetti() {
  const end = Date.now() + 1200;
  const colors = ['#fbbf24', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7'];
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 75,
      origin: { x: 0, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 75,
      origin: { x: 1, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
