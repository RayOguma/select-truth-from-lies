// 効果音。音声ファイルは使わず、Web Audio で合成する。
// ブラウザは操作があるまで音を鳴らせないので、最初のクリックやキー入力で unlock() を呼ぶ。

let ctx = null;
let master = null;
const options = { volume: 60, typing: true };

function ensure() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
    applyVolume();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function applyVolume() {
  if (master) master.gain.value = (options.volume / 100) ** 2;
}

export function configureSound({ volume, typing }) {
  if (volume !== undefined) options.volume = volume;
  if (typing !== undefined) options.typing = typing;
  applyVolume();
}

export function unlock() {
  ensure();
}

function ready() {
  return options.volume > 0 && ctx && ctx.state === 'running';
}

function tone({ freq, type = 'sine', dur = 0.1, gain = 0.2, attack = 0.005, slide, delay = 0 }) {
  if (!ready()) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

let noiseBuffer = null;
function noise({ dur = 0.1, gain = 0.2, freq = 1000, filter = 'lowpass', q = 1, delay = 0 }) {
  if (!ready()) return;
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const biquad = ctx.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.value = freq;
  biquad.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(biquad);
  biquad.connect(env);
  env.connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const chord = (freqs, { gap = 0.1, dur = 0.6, gain = 0.06, type = 'triangle' } = {}) => {
  freqs.forEach((freq, i) => tone({ freq, dur, gain, type, delay: i * gap }));
};

let lastType = 0;

export const sfx = {
  // 文字送り。続けて鳴りすぎないよう間引く
  type() {
    if (!options.typing || !ready()) return;
    const now = performance.now();
    if (now - lastType < 45) return;
    lastType = now;
    tone({ freq: 760 + Math.random() * 160, type: 'square', dur: 0.025, gain: 0.025 });
  },
  key() {
    noise({ dur: 0.03, gain: 0.12, freq: 2800, filter: 'bandpass', q: 1.5 });
  },
  enter() {
    noise({ dur: 0.06, gain: 0.16, freq: 1600, filter: 'bandpass', q: 1.2 });
    tone({ freq: 160, type: 'triangle', dur: 0.07, gain: 0.05 });
  },
  click() {
    tone({ freq: 520, dur: 0.05, gain: 0.05, slide: 780 });
  },
  error() {
    tone({ freq: 220, type: 'square', dur: 0.1, gain: 0.04 });
    tone({ freq: 165, type: 'square', dur: 0.14, gain: 0.04, delay: 0.1 });
  },
  ng() {
    tone({ freq: 330, type: 'triangle', dur: 0.15, gain: 0.07, slide: 247 });
  },
  mail() {
    tone({ freq: 880, dur: 0.2, gain: 0.08 });
    tone({ freq: 1320, dur: 0.35, gain: 0.08, delay: 0.13 });
  },
  success() {
    chord([523, 659, 784, 1047], { gap: 0.08, dur: 0.35, gain: 0.06 });
  },
  login() {
    chord([392, 523, 659, 784], { gap: 0.12, dur: 0.7, gain: 0.05, type: 'sine' });
  },
  item() {
    chord([784, 1175, 1568], { gap: 0.07, dur: 0.4, gain: 0.05, type: 'sine' });
  },
  monologue() {
    tone({ freq: 660, dur: 0.18, gain: 0.03 });
  },
  page() {
    noise({ dur: 0.18, gain: 0.08, freq: 4000, filter: 'highpass' });
  },
  chapter() {
    tone({ freq: 110, dur: 2.2, gain: 0.16, attack: 0.02 });
    tone({ freq: 165, dur: 2.2, gain: 0.06, attack: 0.02 });
  },
  phone() {
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < 10; i++) {
        tone({ freq: i % 2 ? 1480 : 1180, type: 'square', dur: 0.045, gain: 0.03, delay: ring * 1.0 + i * 0.05 });
      }
    }
  },
  door() {
    tone({ freq: 1250, type: 'square', dur: 0.06, gain: 0.03 });
    tone({ freq: 1660, type: 'square', dur: 0.08, gain: 0.03, delay: 0.09 });
    noise({ dur: 0.45, gain: 0.18, freq: 380, delay: 0.35 });
    tone({ freq: 95, type: 'triangle', dur: 0.5, gain: 0.14, slide: 60, delay: 0.35 });
  },
  appear() {
    chord([1047, 1319, 1568, 2093], { gap: 0.14, dur: 0.8, gain: 0.035, type: 'sine' });
  },
  bad() {
    tone({ freq: 55, type: 'sawtooth', dur: 3.5, gain: 0.07, attack: 0.3 });
    tone({ freq: 58, type: 'sawtooth', dur: 3.5, gain: 0.05, attack: 0.3 });
  },
  trueEnd() {
    chord([262, 330, 392, 523, 659, 784], { gap: 0.22, dur: 2.4, gain: 0.05, type: 'sine' });
  },
  normalEnd() {
    chord([220, 262, 330, 440], { gap: 0.3, dur: 2.4, gain: 0.05, type: 'sine' });
  },
};
