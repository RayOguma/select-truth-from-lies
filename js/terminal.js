// sqlite3 のCLI風ターミナル

import { h } from './dom.js';
import { sfx } from './sound.js';

const PROMPT = 'sqlite> ';
const CONTINUE = '   ...> ';
export const MAX_ROWS = 200;

export function createTerminal({ onRun, columnNote = () => null }) {
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

  out.append(h('pre', { class: 'term-text' }, 'SQLite version 3.49.1\nEnter ".help" for usage hints.\n困ったときは SELECT * FROM hint; （実行するたびに詳しくなります）'));

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
      h('thead', {}, h('tr', {}, columns.map((c) => {
        const note = columnNote(c);
        return h('th', { title: note ? `${c}：${note}` : null, class: note ? 'has-note' : null }, c);
      }))),
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

  // いちばん新しい結果の中から、その列を探して枠で囲み、見出しが見えるところまで戻す。
  // 返す関数で枠を外す
  function focusColumn(name) {
    const tables = [...out.querySelectorAll('.term-table')].reverse();
    for (const table of tables) {
      const index = [...table.querySelectorAll('th')].findIndex((th) => th.textContent === name);
      if (index < 0) continue;
      const cells = [...table.rows].map((row) => row.cells[index]).filter(Boolean);
      cells.forEach((cell) => cell.classList.add('col-focus'));
      cells[0].classList.add('col-focus-top');
      cells[cells.length - 1].classList.add('col-focus-bottom');
      const th = cells[0];
      const rootRect = root.getBoundingClientRect();
      root.scrollTo({ top: root.scrollTop + th.getBoundingClientRect().top - rootRect.top - 12, behavior: 'smooth' });
      const wrap = table.closest('.term-result');
      if (wrap.scrollWidth > wrap.clientWidth) {
        const wrapRect = wrap.getBoundingClientRect();
        const thRect = th.getBoundingClientRect();
        wrap.scrollTo({ left: wrap.scrollLeft + thRect.left - wrapRect.left - (wrapRect.width - thRect.width) / 2, behavior: 'smooth' });
      }
      return () => cells.forEach((cell) => cell.classList.remove('col-focus', 'col-focus-top', 'col-focus-bottom'));
    }
    return () => {};
  }

  // いちばん新しい結果の中から、text を含む行を探して枠で囲み、画面の真ん中まで動かす。
  // 返す関数で枠を外す
  function focusRow(text) {
    const rows = [...out.querySelectorAll('.term-table tbody tr')].reverse();
    const row = rows.find((tr) => [...tr.cells].some((td) => td.textContent.includes(text)));
    if (!row) return () => {};
    row.classList.add('row-focus');
    const rootRect = root.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    root.scrollTo({ top: root.scrollTop + rowRect.top - rootRect.top - (rootRect.height - rowRect.height) / 2, behavior: 'smooth' });
    return () => row.classList.remove('row-focus');
  }

  // 主人公が打つところを見せる。1文字ずつ入力して、最後に実行する
  function autoType(text, delay = 45) {
    input.readOnly = true;
    input.value = '';
    return new Promise((resolve) => {
      let n = 0;
      const timer = setInterval(() => {
        n++;
        input.value = text.slice(0, n);
        resize();
        if (text[n - 1] !== '\n') sfx.key();
        if (n < text.length) return;
        clearInterval(timer);
        setTimeout(() => {
          input.readOnly = false;
          sfx.enter();
          submit();
          resolve();
        }, 400);
      }, delay);
    });
  }

  return {
    el: root,
    focus: () => input.focus(),
    focusColumn,
    focusRow,
    autoType,
    scrollToBottom: () => root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' }),
  };
}
