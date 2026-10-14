// sqlite3 のCLI風ターミナル

import { h } from './dom.js';
import { sfx } from './sound.js';

const PROMPT = 'sqlite> ';
const CONTINUE = '   ...> ';
const MAX_ROWS = 200;

export function createTerminal({ onRun }) {
  const out = h('div', { class: 'term-out' });
  const prompt = h('span', { class: 'term-prompt' }, PROMPT);
  const input = h('textarea', {
    class: 'term-input', rows: 1, spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'SQLを入力',
  });
  const root = h('div', { class: 'term', onclick: () => { if (!window.getSelection().toString()) input.focus(); } },
    out,
    h('div', { class: 'term-line' }, prompt, input),
  );

  let buffer = [];
  const history = [];
  let historyIndex = 0;

  out.append(h('pre', { class: 'term-text' }, 'SQLite version 3.49.1\nEnter ".help" for usage hints.'));

  function resize() {
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }
  input.addEventListener('input', resize);
  input.addEventListener('keydown', (e) => {
    if (!e.isComposing && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')) sfx.key();
  });

  input.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sfx.enter();
      submit();
    } else if (e.key === 'ArrowUp' && !input.value.slice(0, input.selectionStart).includes('\n')) {
      if (historyIndex > 0) {
        e.preventDefault();
        historyIndex--;
        input.value = history[historyIndex];
        resize();
      }
    } else if (e.key === 'ArrowDown' && !input.value.slice(input.selectionEnd).includes('\n')) {
      if (historyIndex < history.length) {
        e.preventDefault();
        historyIndex++;
        input.value = history[historyIndex] ?? '';
        resize();
      }
    }
  });

  function submit() {
    const text = input.value;
    input.value = '';
    resize();
    out.append(h('pre', { class: 'term-echo' }, prompt.textContent + text.replace(/\n/g, `\n${CONTINUE}`)));
    buffer.push(text);
    const joined = buffer.join('\n');
    const trimmed = joined.trim();

    if (trimmed === '') {
      buffer = [];
    } else if (buffer.length === 1 && trimmed.startsWith('.')) {
      execute(trimmed);
    } else if (trimmed.endsWith(';')) {
      execute(joined);
    } else {
      prompt.textContent = CONTINUE;
    }
    scroll();
  }

  function execute(text) {
    buffer = [];
    prompt.textContent = PROMPT;
    history.push(text);
    historyIndex = history.length;
    if (text === '.clear') {
      out.replaceChildren();
      return;
    }
    for (const output of onRun(text)) out.append(render(output));
  }

  function render(output) {
    if (output.type === 'error') {
      sfx.error();
      return h('pre', { class: 'term-error' }, output.text);
    }
    if (output.type === 'text') return h('pre', { class: 'term-text' }, output.text);
    const { columns, values } = output;
    const shown = values.slice(0, MAX_ROWS);
    const table = h('table', { class: 'term-table' },
      h('thead', {}, h('tr', {}, columns.map((c) => h('th', {}, c)))),
      h('tbody', {}, shown.map((row) => h('tr', {}, row.map((v) => (v === null ? h('td', { class: 'null' }, 'NULL') : h('td', {}, v)))))),
    );
    const wrap = h('div', { class: 'term-result' }, table);
    if (values.length > MAX_ROWS) {
      wrap.append(h('div', { class: 'term-more' }, `……全${values.length}行のうち、先頭${MAX_ROWS}行を表示`));
    }
    return wrap;
  }

  function scroll() {
    root.scrollTop = root.scrollHeight;
  }

  return {
    el: root,
    focus: () => input.focus(),
  };
}
