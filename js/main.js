import { h, fill, sleep } from './dom.js';
import { initSql, GameDb } from './db.js';
import { createTerminal, MAX_ROWS } from './terminal.js';
import * as S from './story.js';
import { sfx, unlock } from './sound.js';
import { settings, updateSettings, applySettings, charDelay, TEXT_SIZES, TEXT_SPEEDS } from './settings.js';

const app = document.getElementById('app');
const STATE_KEY = 'sftl-state';
const DB_KEY = 'sftl-db';
const SNAP_KEY = 'sftl-snap';  // 章の開始時点のDB（「章の最初に戻す」用）

let SQL = null;
let gdb = null;
let state = null;
let desk = null;

const newState = (name) => ({
  name,
  chapter: 1,
  scene: 'prologue',  // prologue / intro / room / pc / chapterEnd
  loggedIn: false,
  inbox: ['m1'],
  read: [],
  mailTimes: {},
  solved: {},
  hints: {},
  flags: {},
  monologues: [],
  reported: {},
  evidence: {},
  items: [],
});

// ---- セーブ ----

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(text) {
  const s = atob(text);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

function save() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    if (gdb && !gdb.inTransaction()) localStorage.setItem(DB_KEY, toBase64(gdb.exportBytes()));
  } catch (e) {
    console.warn('セーブに失敗しました', e);
  }
  updateTodo();
}

function takeSnapshot() {
  localStorage.setItem(SNAP_KEY, toBase64(gdb.exportBytes()));
}

const hasSave = () => Boolean(localStorage.getItem(STATE_KEY) && localStorage.getItem(DB_KEY));

const nowHm = () => {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ---- 共通の演出 ----

// 文字送りで音を鳴らさない文字
const SILENT = /[\s　、。，．…「」『』（）！？!?・]/;

// 文字を1つずつ足していく（タイトル・章の引きなど）。要素が画面から消えたら false を返す
async function typeInto(el, text, delay = charDelay()) {
  if (!delay) {
    el.textContent += text;
    return el.isConnected;
  }
  for (const ch of text) {
    if (!el.isConnected) return false;
    el.textContent += ch;
    if (!SILENT.test(ch)) sfx.type();
    await sleep(delay);
  }
  return true;
}

// セリフ送り。クリック / Enter / Space で進む
function talk(lines) {
  document.activeElement?.blur();
  return new Promise((resolve) => {
    const who = h('div', { class: 'dialog-who' });
    const text = h('div', { class: 'dialog-text' });
    const next = h('div', { class: 'dialog-next' }, '▼');
    const layer = h('div', { class: 'dialog-layer' }, h('div', { class: 'dialog' }, who, text, next));
    app.append(layer);

    let index = 0;
    let timer = null;
    let finish = null;

    function show() {
      const line = lines[index];
      pushLog(line.who ?? '', line.text);
      who.textContent = line.who ?? '';
      who.classList.toggle('empty', !line.who);
      next.classList.add('hidden');
      const chars = [...line.text];
      let n = 0;
      finish = () => {
        clearInterval(timer);
        timer = null;
        text.textContent = line.text;
        next.classList.remove('hidden');
      };
      text.textContent = '';
      if (!charDelay()) return finish();
      timer = setInterval(() => {
        n++;
        text.textContent = chars.slice(0, n).join('');
        if (!SILENT.test(chars[n - 1])) sfx.type();
        if (n >= chars.length) finish();
      }, charDelay());
    }

    function advance() {
      if (timer) return finish();
      index++;
      if (index < lines.length) return show();
      layer.remove();
      document.removeEventListener('keydown', onKey);
      save();
      resolve();
    }

    function onKey(e) {
      if (document.querySelector('.modal-layer.top')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    }

    layer.addEventListener('click', advance);
    document.addEventListener('keydown', onKey);
    show();
  });
}

function modal(content, { onClose, className = '', top = false } = {}) {
  document.activeElement?.blur();
  const layer = h('div', { class: `modal-layer${top ? ' top' : ''}` }, h('div', { class: `modal ${className}` }, content));
  function close() {
    layer.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  layer.addEventListener('click', (e) => { if (e.target === layer) close(); });
  document.addEventListener('keydown', onKey);
  app.append(layer);
  return { layer, close };
}

function showPaper(title, lines) {
  return new Promise((resolve) => {
    const m = modal(
      h('div', { class: 'paper' },
        h('h3', {}, title),
        h('div', { class: 'paper-body' }, lines.map((line) => h('p', {}, line || ' '))),
        h('button', { class: 'btn small', onclick: () => m.close() }, '閉じる'),
      ),
      { onClose: resolve },
    );
  });
}

function readPaper(paper) {
  const { title, lines } = typeof paper === 'string' ? S.PAPERS[paper] : paper;
  return showPaper(title, lines);
}

// ノートの中身を作る。onClose は「閉じる」ボタン、onPage はページを変えたときに呼ぶ
function buildNotebook({ startTitle = null, onClose, onPage } = {}) {
  let page = 0;
  const body = h('div', { class: 'nb-page' });
  const pageNo = h('span', { class: 'nb-pageno' });
  const prev = h('button', { class: 'btn small', onclick: () => go(page - 1) }, '← 前');
  const next = h('button', { class: 'btn small', onclick: () => go(page + 1) }, '次 →');
  const el = h('div', { class: 'notebook' },
    body,
    h('div', { class: 'nb-nav' }, prev, pageNo, next, h('button', { class: 'btn small ghost', onclick: () => onClose?.() }, '閉じる')),
  );

  function go(p, silent = false) {
    const nextPage = Math.max(0, Math.min(S.NOTEBOOK.length - 1, p));
    if (nextPage !== page && !silent) sfx.page();
    page = nextPage;
    const current = S.NOTEBOOK[page];
    body.innerHTML = current.html;
    const toc = body.querySelector('.nb-toc');
    if (toc) {
      S.NOTEBOOK.forEach((other, i) => {
        if (i < 2) return;
        toc.append(h('li', {}, h('a', { href: '#', onclick: (e) => { e.preventDefault(); go(i); } }, other.title)));
      });
    }
    pageNo.textContent = `${page + 1} / ${S.NOTEBOOK.length}`;
    prev.disabled = page === 0;
    next.disabled = page === S.NOTEBOOK.length - 1;
    body.scrollTop = 0;
    onPage?.(current.title);
  }

  go(Math.max(0, S.NOTEBOOK.findIndex((p) => p.title === startTitle)), true);
  return { el, step: (d) => go(page + d) };
}

// 全画面でノートを開く（部屋の画面や、主人公が説明する場面で使う）。startTitle を渡すと、そのページから開く
function showNotebook(startTitle = null) {
  return new Promise((resolve) => {
    const nb = buildNotebook({ startTitle, onClose: () => m.close() });
    const m = modal(nb.el, { onClose: () => { document.removeEventListener('keydown', onKey); resolve(); }, className: 'modal-notebook' });
    function onKey(e) {
      if (e.key === 'ArrowRight') nb.step(1);
      else if (e.key === 'ArrowLeft') nb.step(-1);
    }
    document.addEventListener('keydown', onKey);
  });
}

// ---- タイトル ----

async function showTitle() {
  setMenu(false);
  dropDesk();
  const typed = h('span', { class: 'title-text' });
  const sub = h('div', { class: 'title-sub hidden' },
    h('p', { class: 'tagline' }, S.TAGLINE),
  );
  const buttons = h('div', { class: 'title-buttons hidden' },
    h('button', { class: 'btn', onclick: showNameInput }, 'はじめから'),
    hasSave() ? h('button', { class: 'btn', onclick: continueGame }, 'つづきから') : null,
    h('button', { class: 'btn ghost', onclick: showSettings }, '設定'),
  );
  app.replaceChildren(h('div', { class: 'scene title' },
    h('h1', { class: 'title-line', 'aria-label': S.TITLE },
      h('span', { class: 'title-prompt' }, 'sqlite> '), typed, h('span', { class: 'cursor' }, '▍')),
    sub,
    buttons,
  ));
  if (!(await typeInto(typed, S.TITLE, 95))) return;
  await sleep(400);
  sub.classList.remove('hidden');
  await sleep(500);
  buttons.classList.remove('hidden');
}

function showNameInput() {
  if (hasSave() && !confirm('セーブデータを消して、はじめから遊びますか？')) return;
  const input = h('input', { class: 'name-input', maxlength: 10, placeholder: '新人', autocomplete: 'off' });
  const start = () => newGame(input.value.trim() || '新人');
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) start(); });
  app.replaceChildren(h('div', { class: 'scene name' },
    h('p', {}, 'あなたの名前を入力してください'),
    input,
    h('button', { class: 'btn', onclick: start }, '決定'),
    h('p', { class: 'note' }, 'ひだまりレジデンスの管理会社に入ったばかりの、システム担当です。'),
  ));
  input.focus();
}

async function newGame(name) {
  app.replaceChildren(h('div', { class: 'loading' }, '準備中……'));
  try {
    gdb = await GameDb.fromSeed(SQL);
  } catch (e) {
    console.error(e);
    app.replaceChildren(h('div', { class: 'loading' }, 'データを読み込めませんでした。ページを再読み込みしてください。'));
    return;
  }
  gdb.exec('UPDATE staff SET name = ? WHERE staff_id = 5', [name]);
  state = newState(name);
  refreshHint();
  takeSnapshot();
  save();
  await playPrologue();
}

function continueGame() {
  try {
    state = JSON.parse(localStorage.getItem(STATE_KEY));
    gdb = GameDb.fromBytes(SQL, fromBase64(localStorage.getItem(DB_KEY)));
  } catch (e) {
    console.error(e);
    alert('セーブデータを読み込めませんでした。');
    return;
  }
  state.reported ??= {};
  state.evidence ??= {};
  if (!gdb.inTransaction()) refreshHint();
  // 持ち物がなかった頃のセーブは、進み具合から持っているはずの物を補う
  if (!state.items) {
    state.items = [];
    if (state.loggedIn) state.items.push('techo');
    if (state.chapter > 2) state.items.push('notice');
    if (state.chapter > 7) state.items.push('letter');
  }
  if (state.scene === 'badEnd') return showBadEnd();
  if (state.scene === 'ending') return showEnding();
  if (state.scene === 'prologue') return playPrologue();
  // 章の区切りの画面があった頃のセーブ
  if (state.scene === 'chapterEnd') {
    state.scene = 'room';
    state.room = null;
    return startChapter(state.chapter + 1);
  }
  if (state.scene === 'intro') {
    state.scene = 'room';
    state.pendingIntro = state.chapter;
    return showRoom(S.CHAPTERS[state.chapter].room);
  }
  if (state.scene === 'pc') showPC();
  else showRoom();
  // 次へつなぐやり取りの途中で閉じていたら、そこから
  const okMail = S.CHAPTERS[state.chapter].okMail ?? S.REPORTS[state.chapter]?.okMail;
  if (okMail && state.read.includes(okMail) && S.CHAPTERS[state.chapter + 1]) advance(state.chapter);
}

async function playPrologue() {
  setMenu(true);
  app.replaceChildren(h('div', { class: 'scene prologue' }));
  await talk(S.prologue(state.name));
  showRoom(S.CHAPTERS[state.chapter].room);
}

// ---- 部屋モード ----

const pos = (r) => ({ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` });

// 移動できる場所（いまの章までに舞台になった部屋）。古いセーブにも対応するため、進んだ章から求める
function reachableRooms() {
  const ids = [];
  for (let n = 1; n <= state.chapter; n++) {
    const id = S.CHAPTERS[n].room;
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

// 部屋の見た目は、その部屋で起きた章（room.chapter）がクリア済みかどうかで決まる
function showRoom(roomId = state.room ?? S.CHAPTERS[state.chapter].room) {
  parkDesk();
  setMenu(true);
  state.scene = 'room';
  state.room = roomId;
  save();
  const room = S.ROOMS[roomId];
  const owner = room.chapter ?? state.chapter;
  const stage = h('div', { class: `stage stage-${roomId}` },
    h('div', { class: 'room-wall' }),
    h('div', { class: 'room-floor' }),
  );
  for (const d of room.decor) {
    stage.append(h('div', { class: d.class, style: pos(d) }));
  }
  for (const spot of room.hotspots) {
    // solvedChapter があるものは、その章を解いたかどうかで決める（エントランスのように、章をまたいで行く場所の物）
    const chapterOf = spot.solvedChapter ?? owner;
    const spotSolved = Boolean(state.solved[chapterOf]);
    if (spot.hideWhenTaken && state.items.includes(spot.item)) continue;
    const cls = [
      'spot', spot.class,
      spotSolved && S.CHAPTERS[chapterOf].finale?.open === spot.id ? 'opened' : '',
    ].join(' ');
    const current = spotSolved && spot.lookSolved ? { ...spot, look: spot.lookSolved } : spot;
    stage.append(h('button', { class: cls, style: pos(spot), 'data-id': spot.id, 'aria-label': spot.label, onclick: () => look(current) },
      spot.text ? h('span', { class: 'spot-text' }, spot.text) : null,
      h('span', { class: 'spot-label' }, spot.label)));
  }
  const others = reachableRooms().filter((id) => id !== roomId);
  app.replaceChildren(h('div', { class: 'scene room' },
    h('header', { class: 'room-header' },
      h('span', {}, room.name),
      h('span', { class: 'room-header-right' },
        others.length ? h('button', { class: 'btn small move-btn', onclick: () => showMoveMenu(others) }, '移動') : null,
        h('span', { class: 'room-date' }, '9月28日（月）'))),
    stage,
  ));
  const chapter = S.CHAPTERS[state.chapter];
  const guideMove = () => {
    const button = app.querySelector('.move-btn');
    if (button) showGuide(button, 'guideMove', 'ここから、別の場所へ移動できます。');
  };
  if (state.pendingIntro === state.chapter && roomId === chapter.room && chapter.intro) {
    state.pendingIntro = null;
    save();
    setTimeout(async () => {
      await talk(chapter.intro);
      guideMove();
    }, 300);
  } else {
    setTimeout(guideMove, 400);
  }
}

function showMoveMenu(rooms) {
  const m = modal(h('div', { class: 'move-menu' },
    h('h3', {}, 'どこへ行く？'),
    rooms.map((id) => h('button', { class: 'btn', onclick: () => { m.close(); showRoom(id); } }, S.ROOMS[id].name)),
    h('button', { class: 'btn small ghost', onclick: () => m.close() }, 'やめる'),
  ));
}

let looking = false;
async function look(spot) {
  if (spot.go === 'pc') return showPC();
  if (looking) return;
  looking = true;
  try {
    if (spot.item && state.items.includes(spot.item)) {
      await talk(spot.lookTaken ?? [{ text: 'もう何もない。' }]);
      return;
    }
    if (spot.look) await talk(spot.look);
    if (spot.paper) await readPaper(spot.paper);
    if (spot.notebook) await showNotebook();
    if (spot.item) {
      await gainItem(spot.item);
      await useItem(spot.item);
    }
  } finally {
    looking = false;
  }
}

// ---- 持ち物 ----

async function gainItem(id) {
  if (state.items.includes(id)) return;
  state.items.push(id);
  save();
  updateItemBadge();
  sfx.item();
  await talk([{ text: `${S.ITEMS[id].name}を手に入れた。` }]);
  showGuide(itemButton, 'guideItems', 'ここから、手に入れた物をいつでも見返せます。');
}

function useItem(id) {
  const item = S.ITEMS[id];
  if (item.notebook) return desk ? openApp('notebook') : showNotebook();
  return readPaper(item.paper);
}

function showItems() {
  if (!state) return;
  const list = state.items.map((id) => {
    const item = S.ITEMS[id];
    // 中身を開くときは、持ち物の一覧を閉じてから開く
    return h('button', { class: 'item-card', onclick: () => { m.close(); useItem(id); } },
      h('span', { class: `item-icon item-${id}` }),
      h('span', { class: 'item-text' },
        h('span', { class: 'item-name' }, item.name),
        h('span', { class: 'item-desc' }, item.desc)));
  });
  const m = modal(h('div', { class: 'menu-panel items-panel' },
    h('h3', {}, '持ち物'),
    list.length ? list : h('p', { class: 'menu-note' }, 'まだ何も持っていない。'),
    h('button', { class: 'btn ghost', onclick: () => m.close() }, '閉じる'),
  ), { top: true });
}

function updateItemBadge() {
  itemButton.querySelector('.badge')?.remove();
  if (state?.items.length) itemButton.append(h('span', { class: 'badge' }, state.items.length));
}

// ---- PCモード ----

function exitButton() {
  return h('button', { class: 'btn exit', onclick: () => showRoom() }, '周りを調べる');
}

function showPC() {
  setMenu(true);
  state.scene = 'pc';
  save();
  if (state.loggedIn) return showDesktop();

  const input = h('input', { type: 'password', class: 'lock-input', autocomplete: 'off', 'aria-label': 'パスワード' });
  const message = h('p', { class: 'lock-msg' });
  const box = h('form', { class: 'lock-box', onsubmit: (e) => { e.preventDefault(); tryLogin(); } },
    h('div', { class: 'lock-avatar' }, 'H'),
    h('p', { class: 'lock-user' }, 'hinata'),
    input,
    h('button', { class: 'btn small', type: 'submit' }, 'ログイン'),
    message,
  );
  function tryLogin() {
    if (input.value.replace(/\D/g, '') === S.PASSWORD) {
      sfx.login();
      state.loggedIn = true;
      showPC();
      return;
    }
    sfx.error();
    message.textContent = 'パスワードが違います';
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    input.select();
  }
  app.replaceChildren(h('div', { class: 'scene pc lock' }, exitButton(), box));
  input.focus();
}

// PCを離れても、デスクトップ（開いていたウィンドウ、ターミナルの履歴など）はそのまま取っておく
let parkedDesk = null;

function parkDesk() {
  if (!desk) return;
  // 出ていた吹き出しは片付ける（気づきは、戻ってきたときに出し直す）
  toastSeq++;
  toastCleanup?.();
  toastCleanup = null;
  desk.toast.classList.add('hidden');
  parkedDesk = desk;
  desk = null;
}

function dropDesk() {
  desk = null;
  parkedDesk = null;
}

function showDesktop() {
  if (parkedDesk) {
    desk = parkedDesk;
    parkedDesk = null;
    app.replaceChildren(desk.scene);
  } else {
    const icons = h('div', { class: 'icons' });
    const windows = h('div', { class: 'windows' });
    const toast = h('div', { class: 'toast hidden', role: 'status', onclick: () => toastDismiss?.() });
    const clock = h('span', { class: 'clock' });
    const tasks = h('div', { class: 'tasks' });
    const scene = h('div', { class: 'scene pc desktop' },
      exitButton(), icons, windows, toast,
      h('div', { class: 'taskbar' }, h('span', { class: 'taskbar-user' }, 'hinata'), tasks, clock),
    );
    desk = { scene, icons, windows, toast, clock, tasks, open: new Map(), z: 10, mail: null };
    app.replaceChildren(scene);
    restoreLayout();
  }
  // 閉じる前にPCを離れた気づきは、戻ってきたときに出し直す
  if (toastShowing) toastQueue.unshift(toastShowing);
  toastBusy = false;
  toastDismiss = null;
  toastShowing = null;
  if (toastQueue.length) setTimeout(nextToast, 800);
  const { clock } = desk;
  const tick = () => {
    if (!clock.isConnected) return;
    clock.textContent = `2026/09/28　${nowHm()}`;
    setTimeout(tick, 15000);
  };
  tick();
  renderIcons();
  renderTaskbar();
  desk.mail?.refresh();
  if (desk.open.has('terminal') && !desk.open.get('terminal').classList.contains('minimized')) terminal?.focus();
  const chapter = S.CHAPTERS[state.chapter];
  const callFlag = `call${state.chapter}`;
  if (chapter.call && !state.flags[callFlag] && !state.solved[state.chapter]) {
    state.flags[callFlag] = true;
    save();
    setTimeout(async () => {
      sfx.phone();
      await sleep(2000);
      talk(chapter.call(state.name));
    }, 1500);
  }
}

const unreadCount = () => state.inbox.filter((id) => !state.read.includes(id)).length;

function renderIcons() {
  if (!desk) return;
  const items = [
    { id: 'mail', label: 'メール', badge: unreadCount() },
    { id: 'memo', label: '日向のメモ.txt' },
    { id: 'notebook', label: 'SQLノート' },
    state.flags.terminal ? { id: 'terminal', label: 'ターミナル' } : null,
  ].filter(Boolean);
  desk.icons.replaceChildren(...items.map((item) => h('button', {
    class: `icon icon-${item.id}${item.id === 'terminal' && !state.flags.terminalSeen ? ' new' : ''}`,
    onclick: () => openApp(item.id),
  },
  h('span', { class: 'icon-img' }),
  h('span', { class: 'icon-label' }, item.label),
  item.badge ? h('span', { class: 'badge' }, item.badge) : null)));
}

function openApp(id) {
  // 開いているウィンドウは手前に出すだけ（中身を作り直すと、選んでいたメールや入力が消える）
  const opened = desk.open.get(id);
  if (opened) return focusWindow(opened);
  if (id === 'mail') return openWindow('mail', 'メール', buildMail(), { w: 720, h: 460 });
  if (id === 'memo') return openWindow('memo', '日向のメモ.txt - メモ帳', h('pre', { class: 'memo' }, S.MEMO_TXT), { w: 480, h: 300, label: 'メモ帳' });
  if (id === 'notebook') {
    // ターミナルと並べて読めるように、右側に開く
    const nb = buildNotebook({
      startTitle: state.notebookPage,
      onClose: () => closeWindow('notebook'),
      onPage: (title) => { state.notebookPage = title; },
    });
    nb.el.classList.add('in-window');
    const w = Math.min(560, desk.windows.clientWidth - 40);
    return openWindow('notebook', 'SQLノート — 日向', nb.el, {
      w, h: Math.min(620, desk.windows.clientHeight - 40), x: Math.max(20, desk.windows.clientWidth - w - 20), y: 20, label: 'SQLノート',
    });
  }
  if (id === 'terminal') {
    const firstTime = !state.flags.terminalSeen;
    state.flags.terminalSeen = true;
    save();
    renderIcons();
    const win = openWindow('terminal', 'ターミナル — sqlite3 hidamari.db', buildTerminal(), {
      w: 820, h: 500, label: 'ターミナル',
      tools: [h('button', { class: 'win-tool', onclick: resetChapter }, '章の最初に戻す')],
    });
    if (firstTime) setTimeout(() => showHintGuide(win), 50);
    return win;
  }
  return null;
}

// 初めてターミナルを開いたときに、hint テーブルの使い方を説明する
function showHintGuide(win) {
  const m = modal(
    h('div', { class: 'hints' },
      h('h3', {}, 'ヒントの見方'),
      h('p', {}, '困ったときは、ターミナルでこう入力してください。'),
      h('pre', { class: 'code' }, 'SELECT * FROM hint;'),
      h('p', {}, 'いま調べていることのヒントが出ます。実行するたびに、ヒントが1段階ずつ詳しくなります（3段階目は、ほぼ答えです）。'),
      h('p', { class: 'hint-note' }, 'メールの「桐山に相談」でも、同じヒントを聞けます。聞かなくても進められるので、困ったときだけどうぞ。'),
      h('div', { class: 'hint-buttons' }, h('button', { class: 'btn small', onclick: () => m.close() }, 'わかった')),
    ),
    { className: 'modal-hints', onClose: () => win.querySelector('.term-input')?.focus() },
  );
}

const MIN_W = 320;
const MIN_H = 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

function openWindow(id, title, content, { w = 560, h: height = 400, x = null, y = null, tools = [], label = title } = {}) {
  const existing = desk.open.get(id);
  if (existing) {
    focusWindow(existing);
    return existing;
  }
  const offset = desk.open.size * 28;
  const bar = h('div', { class: 'win-bar', ondblclick: (e) => { if (!e.target.closest('button')) minimizeWindow(id); } },
    h('span', { class: 'win-title' }, title),
    ...tools,
    h('button', { class: 'win-min', 'aria-label': 'タスクバーにしまう', title: 'タスクバーにしまう', onclick: () => minimizeWindow(id) }, '－'),
    h('button', { class: 'win-close', 'aria-label': '閉じる', title: '閉じる', onclick: () => closeWindow(id) }, '×'),
  );
  const win = h('div', { class: 'win', 'data-id': id, 'data-label': label }, bar, h('div', { class: 'win-body' }, content));
  win.addEventListener('pointerdown', () => focusWindow(win));
  makeDraggable(bar, win);
  makeResizable(win);
  desk.windows.append(win);
  desk.open.set(id, win);
  setGeometry(win, { x: x ?? 140 + offset, y: y ?? 40 + offset, w, h: height });
  focusWindow(win);
  saveLayout();
  return win;
}

// 位置と大きさを、デスクトップの中に収まるようにして決める
function setGeometry(win, { x, y, w, h: height }) {
  const areaW = desk.windows.clientWidth || window.innerWidth;
  const areaH = desk.windows.clientHeight || window.innerHeight;
  const width = clamp(w, MIN_W, areaW);
  const hgt = clamp(height, MIN_H, areaH);
  win.style.width = `${width}px`;
  win.style.height = `${hgt}px`;
  win.style.left = `${clamp(x, 0, areaW - width)}px`;
  win.style.top = `${clamp(y, 0, areaH - hgt)}px`;
}

function geometryOf(win) {
  return {
    x: parseFloat(win.style.left), y: parseFloat(win.style.top),
    w: parseFloat(win.style.width), h: parseFloat(win.style.height),
  };
}

function focusWindow(win) {
  win.classList.remove('minimized');
  win.style.zIndex = ++desk.z;
  renderTaskbar();
  return win;
}

function minimizeWindow(id) {
  desk.open.get(id)?.classList.add('minimized');
  renderTaskbar();
  saveLayout();
}

function closeWindow(id) {
  desk.open.get(id)?.remove();
  desk.open.delete(id);
  if (id === 'mail') desk.mail = null;
  renderTaskbar();
  saveLayout();
}

// いちばん手前に出ているウィンドウ（しまっているものは除く）
function topWindow() {
  let top = null;
  for (const win of desk.open.values()) {
    if (win.classList.contains('minimized')) continue;
    if (!top || Number(win.style.zIndex) > Number(top.style.zIndex)) top = win;
  }
  return top;
}

// タスクバーに、開いているウィンドウを並べる。押すと、しまう / 出す
function renderTaskbar() {
  if (!desk) return;
  const top = topWindow();
  fill(desk.tasks, [...desk.open].map(([id, win]) => {
    const minimized = win.classList.contains('minimized');
    return h('button', {
      class: `task${minimized ? ' minimized' : ''}${win === top ? ' active' : ''}`,
      title: minimized ? '出す' : win === top ? 'しまう' : '手前に出す',
      onclick: () => {
        if (win === top) return minimizeWindow(id);
        focusWindow(win);
        if (id === 'terminal') terminal?.focus();
      },
    }, win.dataset.label);
  }));
}

// ウィンドウの配置をセーブに残す（再読み込みしても同じ配置で開く）
let restoringLayout = false;
function saveLayout() {
  if (!desk || restoringLayout) return;
  state.windows = [...desk.open]
    .sort((a, b) => Number(a[1].style.zIndex) - Number(b[1].style.zIndex))
    .map(([id, win]) => ({ id, ...geometryOf(win), min: win.classList.contains('minimized') }));
  save();
}

function restoreLayout() {
  restoringLayout = true;
  try {
    for (const saved of state.windows ?? []) {
      if (saved.id === 'terminal' && !state.flags.terminal) continue;
      const win = openApp(saved.id);
      if (!win) continue;
      setGeometry(win, saved);
      if (saved.min) win.classList.add('minimized');
    }
  } finally {
    restoringLayout = false;
  }
  renderTaskbar();
}

function makeDraggable(handle, win) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const left = win.offsetLeft;
    const top = win.offsetTop;
    handle.setPointerCapture(e.pointerId);
    const move = (ev) => {
      // タイトルバーが画面の外に出て、つかめなくならないようにする
      win.style.left = `${clamp(left + ev.clientX - startX, 0, desk.windows.clientWidth - 80)}px`;
      win.style.top = `${clamp(top + ev.clientY - startY, 0, desk.windows.clientHeight - 32)}px`;
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      saveLayout();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
}

// 右端・下端・右下の角をドラッグして、大きさを変える
function makeResizable(win) {
  for (const dir of ['e', 's', 'se']) {
    const grip = h('div', { class: `win-resize win-resize-${dir}` });
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      focusWindow(win);
      const startX = e.clientX;
      const startY = e.clientY;
      const width = win.offsetWidth;
      const height = win.offsetHeight;
      grip.setPointerCapture(e.pointerId);
      const move = (ev) => {
        if (dir !== 's') win.style.width = `${clamp(width + ev.clientX - startX, MIN_W, desk.windows.clientWidth - win.offsetLeft)}px`;
        if (dir !== 'e') win.style.height = `${clamp(height + ev.clientY - startY, MIN_H, desk.windows.clientHeight - win.offsetTop)}px`;
      };
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        saveLayout();
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });
    win.append(grip);
  }
}

// 吹き出しは順番に1つずつ出す（同時に出ると前のものが読めないため）
const toastQueue = [];
let toastBusy = false;
let toastDismiss = null;
let toastShowing = null;  // 表示中で、まだ閉じていない気づき
let toastFocused = false;  // 列を囲んでスクロールしたか（全部閉じたら入力欄まで戻す）
let toastSeq = 0;  // 表示するたびに増やす。PCを離れたら古い吹き出しの「閉じる」を効かなくする
let toastCleanup = null;  // 表示中の吹き出しが囲んでいる列・行の枠を外す
let terminal = null;

// focus（列名）/ focusRow（行に含まれる文字）を渡すと、気づきが出ているあいだ、ターミナルのその列・行を枠で囲む
// then を渡すと、気づきを閉じたあとにその場面（S.SCENES）を流す
function showToast(text, kind = '', { focus = null, focusRow = null, then = null } = {}) {
  if (!desk) return;
  toastQueue.push({ text, kind, focus, focusRow, then });
  if (!toastBusy) nextToast();
}

// メールの通知は自動で消える。気づき（monologue）は、クリックか Space / Esc で閉じるまで残す
function nextToast() {
  toastDismiss = null;
  toastShowing = null;
  const item = toastQueue.shift();
  if (!item || !desk) {
    toastBusy = false;
    if (terminal?.el.isConnected && toastFocused) terminal.scrollToBottom();
    toastFocused = false;
    return;
  }
  toastBusy = true;
  const { toast } = desk;
  const monologue = item.kind === 'monologue';
  fill(toast,
    monologue ? h('span', { class: 'toast-label' }, '気づき') : null,
    h('span', { class: 'toast-text' }, item.text),
    monologue ? h('span', { class: 'toast-close' }, 'クリック / Space で閉じる') : null,
  );
  toast.className = `toast ${item.kind}`;
  let done = false;
  const seq = ++toastSeq;
  const live = terminal?.el.isConnected;
  const unfocus = (live && item.focus && terminal.focusColumn(item.focus))
    || (live && item.focusRow && terminal.focusRow(item.focusRow))
    || (() => {});
  if (item.focus || item.focusRow) toastFocused = true;
  toastCleanup = unfocus;
  const dismiss = () => {
    if (done || seq !== toastSeq || !desk) return;
    done = true;
    unfocus();
    toastCleanup = null;
    toastDismiss = null;
    toastShowing = null;
    toast.classList.add('hidden');
    if (item.then) {
      toastBusy = true;
      setTimeout(async () => {
        await playScene(item.then);
        nextToast();
      }, 400);
    } else {
      setTimeout(nextToast, 400);
    }
  };
  if (monologue) {
    pushLog('気づき', item.text, 'monologue');
    sfx.monologue();
    toastDismiss = dismiss;
    toastShowing = item;
  } else {
    setTimeout(dismiss, 4500);
  }
}

document.addEventListener('keydown', (e) => {
  if (!toastDismiss || e.isComposing || document.querySelector('.dialog-layer')) return;
  const typing = e.target.matches?.('input, textarea') && e.target.value !== '';
  if (e.key === 'Escape' || (e.key === ' ' && !typing)) {
    e.preventDefault();
    toastDismiss();
  }
});

// 主人公がノートを見ながら、ターミナルでSQLを打ってみせる場面
// 場面は手順の並び。say: セリフ / notebook: ノートをそのページで開く / type: SQLを打って実行する / flag: 進み具合の印を付ける
// if を付けた手順は、その条件に合うときだけ
// focus（列名）を付けた say は、その列を枠で囲みながら話す
async function playScene(id) {
  if (!terminal?.el.isConnected) openApp('terminal');
  for (const step of S.SCENES[id]) {
    if (step.if && !step.if(state)) continue;
    if (step.notebook) {
      if (!state.items.includes('notebook')) {
        state.items.push('notebook');
        save();
        updateItemBadge();
        await talk([{ text: '本棚から、日向さんのノートを取ってきた。' }]);
      }
      await showNotebook(step.notebook);
    } else if (step.type) {
      await terminal.autoType(step.type);
      await sleep(900);
    } else if (step.say) {
      const unfocus = step.focus ? terminal.focusColumn(step.focus) : () => {};
      await talk(step.say);
      unfocus();
    } else if (step.flag) {
      state.flags[step.flag] = true;
      save();
    }
  }
  terminal.scrollToBottom();
  terminal.focus();
}

// ---- メール ----

const mailTime = (id) => S.MAILS[id].time ?? state.mailTimes[id] ?? '';

function buildMail() {
  const list = h('ul', { class: 'mail-list' });
  const view = h('div', { class: 'mail-view' }, h('p', { class: 'mail-empty' }, 'メールを選んでください'));
  const root = h('div', { class: 'mail' },
    h('div', { class: 'mail-side' },
      h('div', { class: 'mail-tools' }, h('button', { class: 'btn small', onclick: showHints }, '桐山に相談')),
      list),
    view,
  );
  let selected = null;

  function refresh() {
    list.replaceChildren(...[...state.inbox].reverse().map((id) => {
      const m = S.MAILS[id];
      const cls = [state.read.includes(id) ? '' : 'unread', selected === id ? 'selected' : ''].join(' ');
      return h('li', { class: cls, onclick: () => open(id) },
        h('div', { class: 'mail-from' }, m.from, h('span', { class: 'mail-time' }, mailTime(id))),
        h('div', { class: 'mail-subject' }, m.subject));
    }));
  }

  function open(id) {
    selected = id;
    const m = S.MAILS[id];
    const firstRead = !state.read.includes(id);
    if (firstRead) state.read.push(id);
    const report = m.report ? S.REPORTS[m.report] : null;
    fill(view,
      h('div', { class: 'mail-head' },
        h('div', { class: 'mail-subject-big' }, m.subject),
        h('div', { class: 'mail-meta' }, `差出人：${m.from}　${mailTime(id)}`)),
      h('pre', { class: 'mail-body' }, m.body(state.name)),
      report && openFields(m.report).length ? reportForm(m.report) : null,
      report && !openFields(m.report).length ? h('p', { class: 'mail-sent' }, '返信済み') : null,
    );
    view.scrollTop = 0;
    refresh();
    renderIcons();
    save();
    if (firstRead) onMailRead(id);
  }

  desk.mail = { refresh, open, current: () => selected };
  refresh();
  return root;
}

function onMailRead(id) {
  if (id === 'm1' && !state.flags.terminal) {
    state.flags.terminal = true;
    save();
    renderIcons();
  }
  const n = Number(Object.keys(S.CHAPTERS).find((k) => (S.CHAPTERS[k].okMail ?? S.REPORTS[k]?.okMail) === id));
  if (!n) return;
  setTimeout(() => (S.CHAPTERS[n].finale ? playFinale(n) : advance(n)), 2500);
}

function deliver(id) {
  if (state.inbox.includes(id)) return;
  state.inbox.push(id);
  state.mailTimes[id] = nowHm();
  save();
  desk?.mail?.refresh();
  renderIcons();
  setTimeout(() => {
    sfx.mail();
    showToast(`新着メール：${S.MAILS[id].from}「${S.MAILS[id].subject}」`);
  }, 1200);
}

// 必須の項目は章クリアまで、証拠の項目は確保するまで表示する
function openFields(n) {
  const report = S.REPORTS[n];
  return report.fields.filter((f) => (f.evidence ? !state.evidence[f.evidence] : !state.reported[n]));
}

function reportForm(n) {
  const inputs = {};
  const status = h('p', { class: 'report-status' });
  return h('form', {
    class: 'report',
    onsubmit: (e) => {
      e.preventDefault();
      const answer = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value.trim()]));
      submitReport(n, answer, status);
    },
  },
  h('div', { class: 'report-title' }, '返信'),
  openFields(n).map((f) => {
    inputs[f.id] = h('input', { class: 'report-input', name: f.id, autocomplete: 'off' });
    return h('label', { class: 'report-field' }, h('span', {}, f.label), inputs[f.id]);
  }),
  h('button', { class: 'btn small', type: 'submit' }, '送信'),
  status);
}

function submitReport(n, answer, status) {
  const report = S.REPORTS[n];
  const fields = openFields(n);
  const required = fields.filter((f) => !f.evidence);
  const optional = fields.filter((f) => f.evidence && answer[f.id]);
  const ng = (message) => {
    sfx.ng();
    status.textContent = `桐山より：${message ?? report.ng}`;
    status.classList.add('ng');
  };
  if (required.some((f) => !answer[f.id]) || (!required.length && !optional.length)) {
    status.textContent = '空欄があります。';
    return;
  }
  if (required.length && !report.check(answer)) return ng();
  // 任意の項目は、必須の項目と一緒に送ったときは間違っていても何も言わない（通常エンドで気づかせる）
  const found = optional.filter((f) => f.check(answer[f.id]));
  if (!required.length && !found.length) return ng(optional[0]?.ng);
  for (const f of found) state.evidence[f.evidence] = true;
  save();
  sfx.success();
  if (required.length) {
    state.reported[n] = true;
    state.solved[n] = true;
    desk.mail?.open(desk.mail.current());
    deliver(report.okMail);
    return;
  }
  status.textContent = `桐山より：${report.thanks}`;
  status.classList.remove('ng');
  setTimeout(() => desk?.mail?.open(desk.mail.current()), 2500);
}

function showHints() {
  const n = state.chapter;
  const hints = S.HINTS[n] ?? [];
  const labels = ['どこを調べればいいか聞く', 'やり方を聞く', '答えに近いところまで聞く'];
  const body = h('div', { class: 'hints' });
  const m = modal(body, { className: 'modal-hints' });
  function render() {
    const level = state.hints[n] ?? 0;
    fill(body,
      h('h3', {}, '桐山に相談'),
      state.solved[n] ? h('p', {}, '今は大丈夫です。次の連絡を待っていてください。') : null,
      hints.slice(0, level).map((text, i) => h('div', { class: 'hint' }, h('span', { class: 'hint-step' }, i + 1), h('span', {}, text))),
      !state.solved[n] && level === 0 ? h('p', { class: 'hint-note' }, '聞かなくても進められます。困ったときだけどうぞ。') : null,
      h('div', { class: 'hint-buttons' },
        !state.solved[n] && level < hints.length
          ? h('button', { class: 'btn small', onclick: () => { state.hints[n] = level + 1; save(); render(); } }, labels[level])
          : null,
        h('button', { class: 'btn small ghost', onclick: () => m.close() }, '閉じる')),
    );
  }
  render();
}

// ---- ターミナル ----

function buildTerminal() {
  const term = createTerminal({
    columnNote: (name) => S.COLUMN_NOTES[name],
    onRun: (text) => {
      if (state.chapter >= 9 && !gdb.inTransaction()) refreshLies();
      if (!text.trim().startsWith('.') && /\bSELECT\b[\s\S]*\bhint\b/i.test(text)) refreshHint(true);
      const { outputs, statements } = gdb.run(text);
      // 気づきは、画面に表示された行だけを見て判定する（表示しきれなかった行には気づけない）
      const visible = outputs.map((o) => (o.type === 'table'
        ? { ...o, values: o.values.slice(0, MAX_ROWS), truncated: o.values.length > MAX_ROWS }
        : o));
      for (const mono of S.MONOLOGUES) {
        if (mono.chapter && mono.chapter !== state.chapter) continue;
        if (mono.after && !state.monologues.includes(mono.after)) continue;
        if (!state.monologues.includes(mono.id) && mono.when(visible, text)) {
          state.monologues.push(mono.id);
          setTimeout(() => showToast(mono.text, 'monologue', mono), 700);
        }
      }
      for (const st of statements) {
        const mono = S.STATEMENT_MONOLOGUES.find((m) => m.when(st));
        if (mono) setTimeout(() => showToast(mono.text, 'monologue'), 700);
      }
      save();
      if (statements.some((st) => st.changes > 0 || /^(COMMIT|END)$/.test(st.kind))) checkGoal();
      checkResultGoal(outputs, text);
      return outputs;
    },
  });
  setTimeout(() => term.focus(), 0);
  terminal = term;
  return term.el;
}

function restoreSnapshot() {
  gdb.replace(fromBase64(localStorage.getItem(SNAP_KEY)));
  save();
  const old = desk?.open.get('terminal');
  if (old) {
    const geometry = geometryOf(old);
    closeWindow('terminal');
    setGeometry(openApp('terminal'), geometry);
    saveLayout();
  }
}

function resetChapter() {
  if (!confirm('データベースを、この章を始めたときの状態に戻しますか？')) return;
  restoreSnapshot();
}

// 書き換える章は、実行後のDBの状態で判定する。
// トランザクション中は確定していないので判定しない（BEGIN しておけば ROLLBACK で戻せる）
function checkGoal() {
  const n = state.chapter;
  const chapter = S.CHAPTERS[n];
  if (!chapter.goal || state.solved[n] || gdb.inTransaction()) return;
  const result = chapter.goal((sql) => gdb.query(sql));
  if (result === 'clear') {
    state.solved[n] = true;
    sfx.success();
    deliver(chapter.okMail);
  } else if (result === 'bad') {
    setTimeout(() => showBadEnd(), 900);
  } else if (result?.retryLines) {
    setTimeout(async () => {
      await talk(result.retryLines);
      restoreSnapshot();
    }, 900);
  }
}

// クエリの結果で判定する章（第8章とエピローグ）
function checkResultGoal(outputs, sql) {
  const n = state.chapter;
  const chapter = S.CHAPTERS[n];
  if (!chapter.resultGoal || state.solved[n] || !chapter.resultGoal(outputs, sql)) return;
  state.solved[n] = true;
  save();
  sfx.success();
  if (n === 8) {
    refreshLies();
    save();
    deliver(chapter.okMail);
  } else if (n === 9) {
    setTimeout(() => showEnding(), 3500);
  }
}

// ヒントの表。hint を読むたびに1段階ずつ詳しくなる。段階は「桐山に相談」と共通
function refreshHint(step = false) {
  const n = state.chapter;
  const hints = S.HINTS[n] ?? [];
  if (step && !state.solved[n] && (state.hints[n] ?? 0) < hints.length) {
    state.hints[n] = (state.hints[n] ?? 0) + 1;
  }
  const rows = state.solved[n]
    ? [[0, '今は大丈夫です。次の連絡を待っていてください。']]
    : hints.slice(0, state.hints[n] ?? 0).map((text, i) => [i + 1, text]);
  gdb.exec('CREATE TABLE IF NOT EXISTS hint (level INTEGER, hint TEXT)');
  gdb.exec('DELETE FROM hint');
  for (const row of rows) gdb.exec('INSERT INTO hint VALUES (?, ?)', row);
}

// 集めた証拠をまとめたビュー。DBの状態で決まる証拠と、報告で確保した証拠を合わせる
function refreshLies() {
  const flag = (key, text) => (state.evidence[key] ? `'${text}'` : 'NULL');
  gdb.exec('DROP VIEW IF EXISTS lies');
  gdb.exec(`CREATE VIEW lies AS
-- 日向：毎晩22時に確かめる。書き換えられた記録が元に戻っていたら、このビューを作る。
-- 直っていない行は空のまま。全部埋まったら、それが本当のことだ。
SELECT 1 AS no, CASE WHEN
  (SELECT COUNT(*) FROM access_log WHERE resident_id = 12 AND logged_at LIKE '2026-09-07 23:12%') = 1
  AND (SELECT COUNT(*) FROM staff_access_log WHERE staff_id = 2 AND logged_at LIKE '2026-09-07 23:41%') = 1
  THEN '9月7日 23時12分、佐伯 悠は自分で建物を出た。23時41分、柳田が入館し、翌朝その記録を書き換えた。' END AS truth
UNION ALL
SELECT 2, ${flag('e2', '架空の住人8人は、すべて柳田が登録していた。')}
UNION ALL
SELECT 3, ${flag('e3', '8人分の家賃補助 342万円は、柳田の口座 4470918 に振り込まれていた。')}
UNION ALL
SELECT 4, CASE WHEN EXISTS (
  SELECT 1 FROM residents r JOIN access_log a ON a.resident_id = r.resident_id
  WHERE r.resident_id = 12 AND r.room_no = '205'
) THEN '佐伯 悠は、証拠を記録に残して身を隠した。「最後は、誰がやったのかを、記録そのものに答えさせてください。」' END`);
}

// ---- 章の終わり ----

async function playFinale(n) {
  const { finale } = S.CHAPTERS[n];
  state.scene = 'room';
  showRoom(finale.room ?? S.CHAPTERS[n].room);
  const stage = app.querySelector('.stage');
  // showRoom はクリア後の状態で描くので、いったん元に戻してから動かす
  stage.querySelectorAll('.opened').forEach((el) => el.classList.remove('opened'));
  await sleep(600);
  const lines = [...finale.lines];
  if (finale.open) {
    await talk(lines.slice(0, -1));
    stage.querySelector(`[data-id="${finale.open}"]`)?.classList.add('opened');
    sfx.door();
    await sleep(900);
    await talk(lines.slice(-1));
  } else {
    await talk(lines);
  }
  if (finale.paper) await readPaper(finale.paper);
  if (finale.item) await gainItem(finale.item);
  await sleep(400);
  advance(n);
}

// ---- エンディング ----

async function showEnding() {
  setMenu(false);
  state.scene = 'ending';
  save();
  const truth = gdb.query('SELECT truth FROM lies ORDER BY no').map((r) => r.truth);
  if (truth.every((t) => t)) return showTrueEnd();
  return showNormalEnd(truth);
}

async function typeLines(container, lines, pause = 1500) {
  for (const line of lines) {
    await sleep(pause);
    if (!container.isConnected) return false;
    container.append(h('p', { class: line ? '' : 'spacer' }, line));
  }
  return true;
}

async function showTrueEnd() {
  dropDesk();
  const body = h('div', { class: 'ending-lines' });
  app.replaceChildren(h('div', { class: 'scene ending' }, body));
  if (!(await typeLines(body, S.TRUE_END.lines))) return;

  const term = h('div', { class: 'ending-term' });
  body.append(term);
  for (const { sql, rows } of S.TRUE_END.terminal) {
    await sleep(1500);
    if (!term.isConnected) return;
    term.append(h('pre', { class: 'term-echo' }, `sqlite> ${sql}`));
    sfx.enter();
    await sleep(900);
    term.append(h('pre', { class: 'term-text' }, rows.map((r) => r.join('|')).join('\n')));
  }

  await sleep(2500);
  sfx.mail();
  const { mail } = S.TRUE_END;
  body.append(h('div', { class: 'ending-mail' },
    h('div', { class: 'mail-meta' }, `差出人：${mail.from}　件名：${mail.subject}`),
    h('p', {}, mail.body)));

  await sleep(3500);
  sfx.trueEnd();
  body.append(h('div', { class: 'ending-final' },
    h('p', { class: 'ending-title' }, S.TRUE_END.title),
    h('p', { class: 'ending-sql' }, S.TITLE),
    h('p', { class: 'ending-thanks' }, 'Thank you for playing.'),
    h('button', { class: 'btn', onclick: showTitle }, 'タイトルへ')));
  body.lastChild.scrollIntoView({ behavior: 'smooth' });
}

async function showNormalEnd(truth) {
  dropDesk();
  const body = h('div', { class: 'ending-lines' });
  app.replaceChildren(h('div', { class: 'scene ending' }, body));
  if (!(await typeLines(body, S.NORMAL_END.lines))) return;
  await sleep(1500);
  body.append(h('ul', { class: 'ending-missing' },
    truth.map((t, i) => h('li', { class: t ? 'ok' : 'missing' }, `${i + 1}. ${S.EVIDENCE_NAMES[i]}　${t ? '……記録あり' : '……空欄'}`))));
  await sleep(1500);
  sfx.normalEnd();
  body.append(h('div', { class: 'ending-final' },
    h('p', { class: 'ending-title' }, S.NORMAL_END.title),
    h('p', { class: 'ending-retry' }, S.NORMAL_END.retry),
    h('button', {
      class: 'btn',
      onclick: () => {
        state.solved[9] = false;
        state.scene = 'pc';
        save();
        showPC();
      },
    }, 'もう少し調べる'),
    h('button', { class: 'btn ghost', onclick: showTitle }, 'タイトルへ')));
}

async function showBadEnd() {
  dropDesk();
  setMenu(false);
  sfx.bad();
  state.scene = 'badEnd';
  save();
  const body = h('div', { class: 'bad-lines' });
  const after = h('div', { class: 'end-after hidden' },
    h('p', { class: 'bad-moral' }, S.BAD_END.moral),
    h('button', {
      class: 'btn',
      onclick: () => {
        restoreSnapshot();
        state.scene = 'room';
        save();
        showRoom(S.CHAPTERS[state.chapter].room);
      },
    }, 'この章の最初からやり直す'),
    h('button', { class: 'btn ghost', onclick: showTitle }, 'タイトルへ'),
  );
  app.replaceChildren(h('div', { class: 'scene chapter-end bad-end' },
    h('p', { class: 'end-title' }, S.BAD_END.title),
    body,
    after,
  ));
  for (const line of S.BAD_END.lines) {
    await sleep(1300);
    if (!body.isConnected) return;
    body.append(h('p', {}, line));
  }
  await sleep(1200);
  after.classList.remove('hidden');
}

// 章の目的を果たしたら、やり取りを挟んで次の章へ。章の区切りは画面に出さない
let advancing = false;
async function advance(n) {
  if (advancing || state.chapter !== n || !S.CHAPTERS[n + 1]) return;
  advancing = true;
  try {
    const chapter = S.CHAPTERS[n];
    if (chapter.bridge) await talk(chapter.bridge(state.name));
    startChapter(n + 1);
  } finally {
    advancing = false;
  }
}

function startChapter(n) {
  const chapter = S.CHAPTERS[n];
  state.chapter = n;
  state.pendingIntro = chapter.intro ? n : null;
  takeSnapshot();
  deliver(chapter.mail);
  save();
  // 部屋にいるときは描き直して、移動先に新しい場所を出す（同じ部屋なら着いたときの地の文が流れる）
  if (state.scene === 'room') showRoom(state.room ?? chapter.room);
}

// ---- メニュー ----

const menuButton = h('button', { class: 'menu-btn hidden', 'aria-label': 'メニュー', onclick: () => openMenu() }, '≡ メニュー');
document.body.append(menuButton);

const itemButton = h('button', { class: 'item-btn hidden', 'aria-label': '持ち物', onclick: () => showItems() }, '持ち物');
document.body.append(itemButton);

const logButton = h('button', { class: 'item-btn log-btn hidden', 'aria-label': 'セリフのログ', onclick: () => showLog() }, 'ログ');
document.body.append(logButton);

// ---- セリフのログ ----

const LOG_MAX = 500;

function pushLog(who, text, kind = '') {
  if (!state) return;
  state.log ??= [];
  state.log.push({ who, text, kind });
  if (state.log.length > LOG_MAX) state.log.splice(0, state.log.length - LOG_MAX);
}

function showLog() {
  if (!state) return;
  const entries = (state.log ?? []).map((e) => h('div', { class: `log-entry ${e.kind}` },
    e.who ? h('span', { class: 'log-who' }, e.who) : null,
    h('span', { class: 'log-text' }, e.text)));
  const list = h('div', { class: 'log-list' }, entries.length ? entries : h('p', { class: 'menu-note' }, 'まだ何もない。'));
  const m = modal(h('div', { class: 'menu-panel log-panel' },
    h('h3', {}, 'ログ'),
    list,
    h('button', { class: 'btn ghost', onclick: () => m.close() }, '閉じる'),
  ), { top: true });
  list.scrollTop = list.scrollHeight;
}

// ---- 今やること ----

// 左下に、今やることを出す。クリックで畳める
const todoBox = h('button', {
  class: 'todo hidden',
  'aria-label': '今やること',
  onclick: () => {
    state.flags.todoFolded = !state.flags.todoFolded;
    save();
  },
});
document.body.append(todoBox);

function todoLines() {
  if (!state || state.scene === 'prologue') return null;
  const n = state.chapter;
  const chapter = S.CHAPTERS[n];
  if (!state.loggedIn) {
    return ['管理人室のパソコンにログインしよう', state.items.includes('techo') ? '手帳に、パスワードのヒントがある' : 'パスワードの手がかりを、管理人室で探す'];
  }
  if (state.pendingIntro === n && !(state.scene === 'room' && state.room === chapter.room)) {
    if (state.room === chapter.room) return ['パソコンから離れて、周りを見てみよう', '左上の「周りを調べる」から'];
    return [`${S.ROOMS[chapter.room].name}へ行こう`, state.scene === 'pc' ? '「周りを調べる」から「移動」で行ける' : '右上の「移動」から行ける'];
  }
  if (state.inbox.some((id) => !state.read.includes(id))) return ['新しいメールを読もう', 'パソコンの「メール」から'];
  if (state.solved[n]) return null;
  const todo = S.TODOS[n];
  const text = (v) => (typeof v === 'function' ? v(state) : v);
  return [text(todo.main), text(todo.sub)];
}

function updateTodo() {
  const lines = menuButton.classList.contains('hidden') ? null : todoLines();
  todoBox.classList.toggle('hidden', !lines);
  if (!lines) return;
  const folded = Boolean(state.flags.todoFolded);
  todoBox.classList.toggle('folded', folded);
  todoBox.title = folded ? 'クリックで開く' : 'クリックで畳む';
  fill(todoBox,
    h('span', { class: 'todo-head' }, folded ? '今やること ▸' : '今やること ▾'),
    folded ? null : h('span', { class: 'todo-main' }, lines[0]),
    folded || !lines[1] ? null : h('span', { class: 'todo-sub' }, lines[1]),
  );
}

// ---- はじめての案内 ----

// ボタンを光らせて、吹き出しで使い方を一度だけ伝える。ボタンか吹き出しを押すと消え、二度と出ない
function showGuide(target, flag, text) {
  if (!state || state.flags[flag] || !target?.isConnected || document.querySelector(`.guide-bubble[data-flag="${flag}"]`)) return;
  const rect = target.getBoundingClientRect();
  const width = 260;
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
  const bubble = h('div', {
    class: 'guide-bubble',
    'data-flag': flag,
    role: 'status',
    style: { left: `${left}px`, top: `${rect.bottom + 12}px`, width: `${width}px`, '--arrow-x': `${rect.left + rect.width / 2 - left}px` },
  }, text);
  target.classList.add('guide-glow');
  const done = () => {
    state.flags[flag] = true;
    save();
    clearGuides();
  };
  bubble.addEventListener('click', done);
  target.addEventListener('click', done, { once: true });
  document.body.append(bubble);
  sfx.monologue();
}

function clearGuides() {
  document.querySelectorAll('.guide-bubble').forEach((el) => el.remove());
  document.querySelectorAll('.guide-glow').forEach((el) => el.classList.remove('guide-glow'));
}

function setMenu(visible) {
  clearGuides();
  menuButton.classList.toggle('hidden', !visible);
  itemButton.classList.toggle('hidden', !visible);
  logButton.classList.toggle('hidden', !visible);
  if (visible) updateItemBadge();
  updateTodo();
}

function openMenu() {
  if (!state) return;
  const m = modal(h('div', { class: 'menu-panel' },
    h('h3', {}, 'メニュー'),
    h('button', { class: 'btn', onclick: () => { m.close(); saveFromMenu(); } }, 'セーブする'),
    h('button', { class: 'btn', onclick: () => { m.close(); showSettings(); } }, '設定'),
    h('button', { class: 'btn', onclick: () => { m.close(); confirmTitle(); } }, 'タイトルに戻る'),
    h('button', { class: 'btn ghost', onclick: () => m.close() }, '閉じる'),
  ), { top: true });
}

function saveFromMenu() {
  const inTransaction = gdb?.inTransaction();
  save();
  sfx.success();
  const m = modal(h('div', { class: 'menu-panel' },
    h('h3', {}, 'セーブしました'),
    inTransaction
      ? h('p', { class: 'menu-note' }, 'トランザクションの途中なので、データベースは BEGIN する前の状態で保存されています。')
      : null,
    h('button', { class: 'btn', onclick: () => m.close() }, '続ける'),
    h('button', { class: 'btn ghost', onclick: () => { m.close(); showTitle(); } }, 'タイトルに戻る'),
  ), { top: true });
}

function confirmTitle() {
  const m = modal(h('div', { class: 'menu-panel' },
    h('h3', {}, 'タイトルに戻りますか？'),
    h('p', { class: 'menu-note' }, 'ここまでの進み具合はセーブされます。'),
    h('button', { class: 'btn', onclick: () => { save(); m.close(); showTitle(); } }, 'タイトルに戻る'),
    h('button', { class: 'btn ghost', onclick: () => m.close() }, 'やめる'),
  ), { top: true });
}

function showSettings() {
  const choice = (key, options) => h('div', { class: 'choice' },
    Object.entries(options).map(([value, { label }]) => h('button', {
      class: `choice-btn${settings[key] === value ? ' selected' : ''}`,
      onclick: (e) => {
        updateSettings({ [key]: value });
        e.currentTarget.parentElement.querySelectorAll('.choice-btn').forEach((b) => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        if (key === 'textSpeed') preview();
      },
    }, label)));

  const sample = h('p', { class: 'settings-sample' });
  async function preview() {
    sample.textContent = '';
    await typeInto(sample, 'DBは嘘をつく。でも、DBは忘れない。');
  }

  const volumeValue = h('span', { class: 'settings-value' }, settings.volume);
  const volume = h('input', { type: 'range', min: 0, max: 100, step: 5, value: settings.volume, 'aria-label': '音量' });
  volume.addEventListener('input', () => {
    updateSettings({ volume: Number(volume.value) });
    volumeValue.textContent = volume.value;
  });
  volume.addEventListener('change', () => sfx.mail());

  const typing = h('input', { type: 'checkbox', checked: settings.typing });
  typing.addEventListener('change', () => {
    updateSettings({ typing: typing.checked });
    if (typing.checked) preview();
  });

  const m = modal(h('div', { class: 'settings-panel' },
    h('h3', {}, '設定'),
    h('div', { class: 'settings-row' }, h('span', { class: 'settings-label' }, '文字の大きさ'), choice('textSize', TEXT_SIZES)),
    h('div', { class: 'settings-row' }, h('span', { class: 'settings-label' }, '文字の速さ'), choice('textSpeed', TEXT_SPEEDS)),
    sample,
    h('div', { class: 'settings-row' }, h('span', { class: 'settings-label' }, '音量'), h('div', { class: 'settings-volume' }, volume, volumeValue)),
    h('label', { class: 'settings-row settings-check' }, h('span', { class: 'settings-label' }, 'タイピング音'), typing),
    h('button', { class: 'btn', onclick: () => m.close() }, '閉じる'),
  ), { top: true });
  preview();
}

// ---- 起動 ----

async function boot() {
  applySettings();
  // ブラウザは操作があるまで音を出せないので、最初の操作で音を有効にする
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  // ボタンを押したときの音
  document.addEventListener('click', (e) => {
    if (e.target.closest('button, .mail-list li, .nb-toc a')) sfx.click();
  }, true);
  app.replaceChildren(h('div', { class: 'loading' }, '読み込み中……'));
  try {
    SQL = await initSql();
  } catch (e) {
    console.error(e);
    app.replaceChildren(h('div', { class: 'loading' }, 'SQLエンジンを読み込めませんでした。ページを再読み込みしてください。'));
    return;
  }
  showTitle();
}

boot();
