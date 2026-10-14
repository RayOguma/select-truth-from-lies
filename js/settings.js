// 設定（文字の大きさ・速さ・音量）。セーブデータとは別に保存し、「はじめから」でも消えない

import { configureSound } from './sound.js';

const KEY = 'sftl-settings';

export const TEXT_SIZES = {
  small: { label: '小', px: 14 },
  medium: { label: '中', px: 16 },
  large: { label: '大', px: 18 },
  xlarge: { label: '特大', px: 20 },
};

export const TEXT_SPEEDS = {
  slow: { label: 'ゆっくり', ms: 60 },
  normal: { label: 'ふつう', ms: 35 },
  fast: { label: 'はやい', ms: 15 },
  instant: { label: '一瞬', ms: 0 },
};

const DEFAULTS = { textSize: 'medium', textSpeed: 'normal', volume: 60, typing: true };

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings = load();

export function applySettings() {
  document.documentElement.style.fontSize = `${(TEXT_SIZES[settings.textSize] ?? TEXT_SIZES.medium).px}px`;
  configureSound({ volume: settings.volume, typing: settings.typing });
}

export function updateSettings(patch) {
  Object.assign(settings, patch);
  localStorage.setItem(KEY, JSON.stringify(settings));
  applySettings();
}

// 1文字あたりの表示間隔（ミリ秒）。0 は一瞬で全部出す
export const charDelay = () => (TEXT_SPEEDS[settings.textSpeed] ?? TEXT_SPEEDS.normal).ms;
