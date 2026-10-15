// 物語の文章と、章ごとの判定

export const TITLE = 'SELECT truth FROM lies;';
export const TAGLINE = 'SQLで謎を解く脱出ゲーム';

// 架空の住人8人の住人番号
const GHOSTS = [14, 16, 18, 19, 21, 22, 23, 24];

// 章ごとの舞台・最初のメール・その場所に着いたときの地の文（intro）。
// bridge は章の目的を果たしたあとのやり取りで、次の場所へ向かうきっかけになる。
// 章の区切りは画面には出さない。判定は REPORTS、ヒントは HINTS に章番号で置く。
export const CHAPTERS = {
  1: {
    title: '第1章　名前のない部屋',
    room: 'kanrinin',
    mail: 'm1',
    bridge: (name) => [
      { text: '……佐伯さんがいなくなった次の日に、誰かが205号室を登録し直している。' },
      { text: 'スマホが鳴った。桐山さんからだ。' },
      { who: '桐山（電話）', text: `${name}さん、メール読みました。……柳田さんが、ですか。` },
      { who: '桐山（電話）', text: '本当に9月7日の夕方に出て行ったのか、まずそこから確かめたいんです。' },
      { who: '桐山（電話）', text: '出入りは、エントランスのオートロックで記録されているはずです。私も今からエントランスに行きますね。' },
      { text: 'エントランスに行ってみよう。' },
    ],
  },
  2: {
    title: '第2章　最後の夜',
    room: 'entrance',
    mail: 'm2',
    intro: [
      { text: '昼前。エントランスに来た。' },
      { who: '桐山', text: 'こっちです。……見てください、佐伯さんのポスト。チラシであふれてしまって。' },
      { who: '桐山', text: '管理人室の窓口からなら、中のパソコンも使えますよ。' },
    ],
    bridge: () => [
      { text: '17時58分に出て行った人の部屋に、21時半、明かりがついていた。' },
      { text: 'スマホが鳴った。エントランスにいた桐山さんからだ。' },
      { who: '桐山（電話）', text: 'メール読みました。どちらかが、間違っている……ということですよね。' },
      { who: '桐山（電話）', text: 'それに、ポストのお知らせにあった佐伯さんの番号は12。でも、名簿の205号室は「不明」の行に変わっていましたよね。佐伯さんの行は、どこへ行ったんでしょう。' },
      { who: '桐山（電話）', text: '私は事務所に戻って、オーナーに報告してきます。管理人室で、記録と名簿を突き合わせてもらえますか。' },
      { text: '管理人室に戻ろう。' },
    ],
  },
  3: {
    title: '第3章　名簿にいない住人たち',
    room: 'kanrinin',
    mail: 'm3',
    intro: [
      { text: '午後。管理人室に戻った。' },
      { text: '番号12。名簿には、その番号の住人がいない。' },
    ],
    bridge: () => [
      { text: '5階には、誰も帰ってきていない。' },
      { text: 'スマホが鳴った。桐山さんからだ。' },
      { who: '桐山（電話）', text: '5階に人が住んでいるなんて、私は一度も聞いたことがありません。オーナーも同じでした。' },
      { who: '桐山（電話）', text: '記録だけ見ていても、何が本当なのか分からなくなってきて……。せめて、佐伯さんの部屋をこの目で確かめたいんです。' },
      { who: '桐山（電話）', text: '2階の、205の前で待っています。' },
      { text: '205号室の前に行ってみよう。' },
    ],
  },
  4: {
    title: '第4章　巻き戻せる時間',
    room: 'corridor2',
    mail: 'm4',
    intro: [
      { text: '2階に上がると、205号室の前で桐山さんが待っていた。' },
      { who: '桐山', text: 'マスターキーは預かっているんです。でも、本人の了解なしに開けるには、それなりの理由が要ります。' },
      { who: '桐山', text: '17時58分と21時半。記録のほうがおかしいと、はっきり言える何かがあれば……。' },
      { who: '桐山', text: 'パソコンで、もう一度確かめてもらえますか。私はここで待っています。' },
    ],
    // 判定はDBの状態で行う。query(sql) は行の配列を返す
    goal: (query) => {
      const count = (sql) => query(sql)[0].n;
      const restored = count(`SELECT COUNT(*) AS n FROM access_log WHERE logged_at LIKE '2026-09-07 23:12%'`) === 1
        && count(`SELECT COUNT(*) AS n FROM access_log WHERE resident_id = 12 AND action = 'OUT' AND logged_at LIKE '2026-09-07 23:12%'`) === 1
        && count(`SELECT COUNT(*) AS n FROM access_log WHERE resident_id = 12 AND logged_at LIKE '2026-09-07 17:58%'`) === 0;
      return restored ? 'clear' : null;
    },
    okMail: 'm4_ok',
    finale: {
      open: 'door205',
      lines: [
        { text: '205号室の前に戻ると、桐山さんがマスターキーを手に待っていた。' },
        { who: '桐山', text: '……開けます。' },
        { text: '桐山さんがマスターキーを回すと、電子錠のランプが緑に変わった。' },
        { text: 'ドアは開いた。' },
      ],
    },
    bridge: () => [
      { text: '部屋の中には、何もなかった。家具だけが残っていて、暮らしていた跡がない。' },
      { who: '桐山', text: '……佐伯さんの物が、何もない。' },
      { text: '誰かが、佐伯さんがここにいた跡を消そうとしている。' },
      { text: '桐山さんのスマホが鳴った。短いやり取りのあと、桐山さんの顔がこわばった。' },
      { who: '桐山', text: 'オーナーからでした。明日の朝、市の家賃補助の申請が、名簿をもとに自動で出るそうです。' },
      { who: '桐山', text: '名簿に載っている人の分が、まとめて。……さっきの、5階の人たちの分も。' },
      { who: '桐山', text: '5階に本当に誰もいないのか、見てきてもらえますか。私は、オーナーにもう少し詳しく聞いてみます。' },
      { text: '5階へ上がってみよう。' },
    ],
  },
  5: {
    title: '第5章　幽霊を消す',
    room: 'corridor5',
    mail: 'm5',
    intro: [
      { text: '夕方。5階に上がってみた。' },
      { text: '廊下に並ぶドアには、どれも表札がない。' },
    ],
    // PCにログインしたところで、柳田から電話が来る
    call: (name) => [
      { text: 'ポケットの中で、スマホが震えた。知らない番号だ。' },
      { who: '柳田（電話）', text: 'あ、もしもし？　管理人の柳田だけど。いやあ、休みの日にごめんねえ。' },
      { who: '柳田（電話）', text: '事務所のパソコン、朝から誰か触ってる？　さっきスマホ見たら、ログインの通知が溜まっててさ。' },
      { text: 'とっさに、桐山さんに頼まれた確認作業だと答えた。' },
      { who: '柳田（電話）', text: `ああ、新人の${name}さんか。熱心だねえ。` },
      { who: '柳田（電話）', text: '……何か困ったら、明日おじさんが見るから。今日はあんまり触らないでおいてよ。' },
      { who: '柳田（電話）', text: '明日の朝は月次処理もあるしね。じゃ、よろしく。' },
      { text: '電話が切れた。' },
      { text: '……明日の朝。それまでに、終わらせないといけない。' },
    ],
    goal: (query) => {
      const ghosts = GHOSTS;
      const real = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 20];
      const ids = new Set(query('SELECT resident_id FROM residents').map((r) => r.resident_id));
      const lostReal = real.filter((id) => !ids.has(id));
      if (lostReal.length === real.length) return 'bad';
      if (lostReal.length) {
        const names = query(`SELECT name FROM residents_trash WHERE resident_id IN (${lostReal.join(',')}) GROUP BY resident_id`).map((r) => r.name);
        return { retryLines: retryLines(names) };
      }
      return ghosts.every((id) => !ids.has(id)) ? 'clear' : null;
    },
    okMail: 'm5_ok',
    finale: {
      lines: [
        { text: '5階の廊下に戻った。' },
        { text: 'ドアは、さっきと同じように並んでいる。' },
        { text: '名簿から8人の名前が消えても、ここは何も変わらない。' },
        { text: '最初から、誰も住んでいなかったのだから。' },
      ],
    },
    bridge: () => [
      { text: '名簿から、8人が消えた。では、8人分のお金はどこへ行っていたのか。' },
      { text: '入金の記録なら、管理人室のパソコンで見られるはずだ。' },
      { text: '管理人室に戻ろう。' },
    ],
  },
  6: {
    title: '第6章　同じ口座に集まるお金',
    room: 'kanrinin',
    mail: 'm6',
    intro: [
      { text: '夜。管理人室に戻った。' },
      { text: '8人分の家賃補助。それは毎月、どこへ振り込まれていたのか。' },
    ],
    bridge: () => [
      { text: '名簿から外した8人は、どこへ行ったんだろう。' },
      { text: '日向さんのノートの最後のページを思い出す。「消したら捨て場に行くようにしておいた」。' },
      { text: '……だとしたら、名簿から消された佐伯さんの行も、そこに残っているかもしれない。' },
    ],
  },
  7: {
    title: '第7章　ゴミ箱の中の手紙',
    room: 'room205',
    mail: 'm7',
    intro: [
      { text: '205号室に入った。' },
      { text: '机とベッドと、空っぽの本棚。カーテンは閉まったまま。' },
      { text: '佐伯さんがここで暮らしていた跡が、何ひとつ残っていない。' },
    ],
    goal: (query) => {
      const saeki = query(`SELECT COUNT(*) AS n FROM residents WHERE name LIKE '佐伯%' AND room_no = '205'`)[0].n > 0;
      const ghostsBack = query(`SELECT COUNT(*) AS n FROM residents WHERE resident_id IN (${GHOSTS})`)[0].n > 0;
      if (ghostsBack) {
        return {
          retryLines: [
            { text: '……待て。外したはずの架空の住人まで、名簿に戻っている。' },
            { text: 'これでは、明日の朝にまた申請が出てしまう。戻すのは佐伯さんだけだ。' },
            { text: 'データベースを、少し前の状態に戻した。' },
          ],
        };
      }
      return saeki ? 'clear' : null;
    },
    okMail: 'm7_ok',
    finale: {
      appear: true,
      lines: [
        { text: '桐山さんに言われて、205号室に入った。' },
        { text: '部屋を見回した。' },
        { text: '……さっきまで空っぽだった机の上に、本と、マグカップと、封筒がある。' },
        { text: '封筒の表には、几帳面な字で「これを読んでいる方へ」。' },
      ],
      paper: 'letter',
      item: 'letter',
    },
    bridge: () => [
      { text: '証拠はそろった。あとは、記録に名前を言わせるだけだ。' },
      { text: '桐山さんに電話をかけて、手紙のことを伝えた。' },
      { who: '桐山（電話）', text: '……無事、なんですね。佐伯さん。本当によかった。' },
      { who: '桐山（電話）', text: '明日の朝、オーナーと警察に相談します。最後にひとつだけ、お願いがあります。メールを送りますね。' },
      { text: '管理人室に戻ろう。' },
    ],
  },
  8: {
    title: '第8章　最終推理',
    room: 'kanrinin',
    mail: 'm8',
    intro: [
      { text: '夜9時。管理人室。' },
      { text: '誰がやったのか。答えはもう、記録の中にある。' },
    ],
    // 名前を1つだけ返すクエリ。名前を直接書いたクエリでは通さない
    resultGoal: (outputs, sql) => {
      const table = outputs.filter((o) => o.type === 'table').pop();
      return Boolean(table)
        && table.values.length === 1 && table.values[0].length === 1 && table.values[0][0] === '柳田'
        && /audit_log/i.test(sql) && /residents/i.test(sql) && /staff/i.test(sql);
    },
    okMail: 'm8_ok',
    bridge: () => [
      { text: '……記録が、答えた。' },
      { text: '夜10時。明日、警察に持っていく資料をまとめようとして、もう一度ターミナルを開いた。' },
      { text: '.tables の一覧に、見覚えのない名前がひとつ増えている。' },
    ],
  },
  9: {
    title: 'エピローグ',
    room: 'kanrinin',
    mail: 'm9',
    resultGoal: (outputs, sql) => /\bFROM\s+lies\b/i.test(sql) && outputs.some((o) => o.type === 'table' && o.columns.includes('truth')),
  },
};

// 左下に出す「今やること」。章の目的と、その補足（進み具合で変わるものは、state を受け取る関数）
export const TODOS = {
  1: { main: '205号室が名簿でどうなっているか調べよう', sub: '誰が登録したのかも。分かったらメールで報告' },
  2: {
    main: '佐伯さんが最後に建物を出た時刻を調べよう',
    sub: (st) => (st.items.includes('notice')
      ? '佐伯さんの住人番号で、入退室の記録を調べる'
      : 'エントランスに、佐伯さんの手がかりがないか見てみる'),
  },
  3: { main: '入退室の記録と名簿を突き合わせよう', sub: '記録にいて名簿にいない番号と、記録が1件もない住人の数' },
  4: { main: '書き換えられた入退室の記録を、元に戻そう', sub: '日向さんが残した仕組みを探す' },
  5: {
    main: (st) => (st.flags.ghostsConfirmed ? '架空の住人8人を、名簿から外そう' : '架空の住人が誰なのか、確かめよう'),
    sub: (st) => (st.flags.ghostsConfirmed ? '本当に住んでいる人は消さないように' : '名簿にいるのに、部屋は空室になっている人を探す'),
  },
  6: { main: '家賃補助の振込先を調べよう', sub: '正規の管理口座 1182034 以外の口座を探す' },
  7: { main: '消された佐伯さんの行を探して、名簿に戻そう', sub: '戻すのは佐伯さんだけ' },
  8: { main: '犯人の名前を1つだけ返すクエリを書こう', sub: '名前を直接書くのはなし' },
  9: { main: '今日分かったことを、ひとつにまとめよう', sub: '.tables に増えたものを見てみる' },
};

// 第5章で本物の住人を消してしまったときの、桐山の指摘
const retryLines = (names) => [
  { text: `……待て。名簿から、${names.join('さん、')}さんまで消えている。` },
  { text: '本当に住んでいる人だ。消してはいけなかった。' },
  { text: 'いったん、元に戻そう。' },
  { text: 'データベースを、少し前の状態に戻した。' },
];

export const BAD_END = {
  title: 'BAD END　空っぽの名簿',
  lines: [
    '名簿から、住人が一人もいなくなった。',
    '翌朝、月次処理が空っぽの名簿を見つけてエラーを出した。',
    '通知を受けた柳田は、すべてを察した。',
    'その日のうちに、管理人室のパソコンは初期化された。',
  ],
  moral: 'WHERE のない DELETE は、全部の行を消す。',
};

// 地の文は who を省く
export const prologue = (name) => [
  { text: '9月28日（月）、午前9時。' },
  { text: '管理会社に入って半月。初めて一人で任された現場は、築20年のマンション「ひだまりレジデンス」だった。' },
  { text: '1階の管理事務所のドアを開けると、奥の机で書類を広げていた人が顔を上げた。' },
  { who: '桐山', text: 'あ……管理会社の方ですね。おはようございます。オーナーの代理をしている、桐山です。' },
  { who: '桐山', text: `システム担当の、${name}さん。急にお呼び立てしてしまって、すみません。よかったら、そちらの椅子にどうぞ。` },
  { text: '勧められた椅子に座ると、桐山さんは手元の書類をそろえて、少し言葉を選ぶように間を置いた。' },
  { who: '桐山', text: '本当は、管理人の柳田さんに相談するのが筋なんですが……柳田さんは、今日はお休みで。' },
  { who: '桐山', text: '実は、205号室にお住まいの佐伯さんという方と、もう3週間、連絡が取れていないんです。' },
  { who: '桐山', text: '柳田さんの話では、9月7日の夕方に出かけたきり、戻っていないそうで。' },
  { who: '桐山', text: '几帳面な方で、こんなことは今までなかったんです。でも柳田さんは「よくあることだから、様子を見よう」と。' },
  { who: '桐山', text: 'それと、もうひとつ。最近、管理システムの記録が、ところどころおかしい気がするんです。' },
  { who: '桐山', text: '前のシステム担当の日向さんが6月に辞めてしまって、私ではパソコンのことがよく分からなくて。それで、会社に相談したら……' },
  { text: '……それで、入ったばかりの自分が呼ばれた、ということらしい。' },
  { who: '桐山', text: '管理人室のパソコンは、日向さんが使っていたものです。柳田さんがいない今日なら、気兼ねなく見てもらえます。' },
  { who: '桐山', text: '私はここで、オーナーと連絡を取っています。確かめてほしいことは、整理してメールで送りますね。' },
  { text: '管理人室の鍵を受け取った。' },
  { text: '管理人室は、事務所の奥にある小さな部屋だった。机の上には、古いパソコンが一台。' },
];

// 部屋。hotspot の go:'pc' はPCモードへ、paper は紙を読む、notebook は日向のノートを開く
export const ROOMS = {
  kanrinin: {
    name: '管理人室',
    decor: [{ class: 'room-desk', x: 26, y: 64, w: 46, h: 30 }],
    hotspots: [
      {
        id: 'window', label: '窓', class: 'spot-window', x: 6, y: 10, w: 22, h: 34,
        look: [
          { text: '窓から、中庭越しに建物が見える。' },
          { text: '5階の窓は、どこもカーテンが閉まったままだ。' },
        ],
      },
      {
        id: 'calendar', label: 'カレンダー', class: 'spot-calendar', x: 33, y: 12, w: 11, h: 22,
        look: [
          { text: '壁のカレンダー。6月のまま、誰もめくっていない。' },
          { text: '19日に赤い丸。横に「最終日」と書いてある。' },
        ],
      },
      {
        id: 'whiteboard', label: 'ホワイトボード', class: 'spot-board', x: 49, y: 10, w: 24, h: 26,
        look: [
          { text: 'ホワイトボードに、柳田の字で予定が書いてある。' },
          { text: '「9/29（火）　月次処理」' },
        ],
      },
      {
        id: 'shelf', label: '本棚', class: 'spot-shelf', x: 78, y: 12, w: 16, h: 58,
        look: [{ text: '本棚に、背表紙に「SQLメモ　日向」と書かれたノートがある。' }],
        item: 'notebook',
        lookTaken: [{ text: '本棚に、ノート1冊分の隙間が空いている。' }],
      },
      { id: 'pc', label: 'パソコン', class: 'spot-pc', x: 36, y: 46, w: 18, h: 18, go: 'pc' },
      {
        id: 'drawer', label: '机の引き出し', class: 'spot-drawer', x: 56, y: 66, w: 12, h: 10,
        look: [{ text: '引き出しの奥に、使い込まれた手帳がある。表紙に「日向」。' }],
        item: 'techo',
        lookTaken: [{ text: '引き出しの中は、もう空っぽだ。' }],
      },
      {
        id: 'door', label: 'ドア', class: 'spot-door', x: 4, y: 50, w: 12, h: 44,
        look: [
          { text: '管理事務所に戻るドアだ。' },
          { text: 'まだ、帰るわけにはいかない。' },
        ],
      },
    ],
  },
  entrance: {
    name: 'エントランス',
    decor: [],
    hotspots: [
      {
        id: 'glassdoor', label: '自動ドア', class: 'spot-glassdoor', x: 3, y: 14, w: 20, h: 80,
        look: [
          { text: '外へ出る自動ドア。' },
          { text: 'まだ、帰るわけにはいかない。' },
        ],
      },
      {
        id: 'autolock', label: 'オートロックの操作盤', class: 'spot-autolock', x: 27, y: 40, w: 7, h: 18,
        look: [
          { text: 'オートロックの操作盤。住人はカードをかざして出入りする。' },
          { text: '出入りは全部、管理システムに記録されるらしい。カードには住人ごとの番号が入っている。' },
        ],
      },
      {
        id: 'mailbox', label: '集合ポスト', class: 'spot-mailbox', x: 38, y: 30, w: 22, h: 34,
        look: [
          { text: '集合ポスト。205のポストから、チラシがはみ出している。' },
          { text: 'チラシに混じって、管理室からのお知らせが入っていた。' },
        ],
        item: 'notice',
        lookTaken: [{ text: '205のポストには、もうチラシしか残っていない。' }],
      },
      {
        id: 'board', label: '掲示板', class: 'spot-bulletin', x: 64, y: 12, w: 18, h: 30,
        look: [
          { text: '掲示板。ゴミ出しの案内と、清掃の当番表が貼ってある。' },
          { text: '当番表の端に、小野寺の字で書き込みがある。' },
          { text: '「気になったことは、管理システムのメモ欄に書いておきます。小野寺」' },
        ],
      },
      {
        id: 'deliverybox', label: '宅配ボックス', class: 'spot-deliverybox', x: 64, y: 50, w: 18, h: 44,
        look: [{ text: '宅配ボックス。どの扉も空いている。' }],
      },
      { id: 'pc', label: '管理人室の窓口', class: 'spot-reception', x: 86, y: 26, w: 12, h: 40, go: 'pc' },
    ],
  },
};

// 廊下のドアをまとめて作る
const aptDoor = (no, x, look, extra = {}) => ({
  id: `door${no}`, label: `${no}号室`, class: 'spot-apt-door', text: no, x, y: 22, w: 13, h: 70, look, ...extra,
});

ROOMS.corridor2 = {
  name: '2階の廊下　205号室の前',
  chapter: 4,
  decor: [],
  hotspots: [
    {
      id: 'window', label: '廊下の窓', class: 'spot-window', x: 3, y: 14, w: 14, h: 34,
      look: [
        { text: '廊下の端の窓。中庭の向こうに、5階の外廊下が見える。' },
        { text: '人の気配はない。' },
      ],
    },
    aptDoor('204', 21, [{ text: '204号室。小川さんの部屋だ。' }]),
    aptDoor('205', 43, [
      { text: '205号室。表札は外されている。' },
      { text: '電子錠のランプは赤のまま。桐山さんのマスターキーでも、理由がなければ開けられない。' },
    ], {
      class: 'spot-apt-door locked',
      lookSolved: [{ text: '205号室。ドアは開いたままだ。' }],
    }),
    aptDoor('206', 65, [{ text: '206号室。「空室」の札が下がっている。' }]),
    { id: 'pc', label: '管理人室へ', class: 'spot-stairs', x: 84, y: 22, w: 13, h: 70, go: 'pc' },
  ],
};

// 第5章のあと（架空の住人を名簿から外したあと）に、5階のドアを調べたとき
const ghostRoomLook = (no) => [{ text: `${no}号室。名簿の上でも、ようやく空室に戻った。` }];

ROOMS.corridor5 = {
  name: '5階の廊下',
  chapter: 5,
  decor: [],
  hotspots: [
    aptDoor('501', 2, [{ text: '501号室。表札はない。新聞受けにチラシが溜まっている。' }], { w: 11, lookSolved: ghostRoomLook('501') }),
    aptDoor('502', 15, [{ text: '502号室。ドアノブに、うっすら埃が積もっている。' }], { w: 11, lookSolved: ghostRoomLook('502') }),
    aptDoor('503', 28, [
      { text: '503号室。表札はない。' },
      { text: 'ドアの横に、たたんだ段ボールが立てかけてある。' },
    ], { w: 11, lookSolved: [...ghostRoomLook('503'), { text: 'ドアの横の段ボールは、まだ立てかけてある。' }] }),
    aptDoor('504', 41, [{ text: '504号室。電気メーターは、ほとんど回っていない。' }], { w: 11, lookSolved: ghostRoomLook('504') }),
    aptDoor('505', 54, [{ text: '505号室。チャイムを押しても、何の音もしない。' }], { w: 11, lookSolved: ghostRoomLook('505') }),
    aptDoor('506', 67, [{ text: '506号室。角部屋。ドアの前の植木鉢は枯れている。' }], { w: 11, lookSolved: ghostRoomLook('506') }),
    { id: 'pc', label: '管理人室へ', class: 'spot-stairs', x: 84, y: 22, w: 13, h: 70, go: 'pc' },
  ],
};

ROOMS.room205 = {
  name: '205号室',
  chapter: 7,
  decor: [
    { class: 'room-desk', x: 30, y: 60, w: 34, h: 34 },
    { class: 'room-bed', x: 70, y: 62, w: 28, h: 32 },
    // 佐伯を名簿に戻すと現れる
    { class: 'room-belongings', x: 33, y: 52, w: 14, h: 9, solved: true },
  ],
  hotspots: [
    {
      id: 'curtain', label: 'カーテン', class: 'spot-curtain', x: 6, y: 8, w: 22, h: 48,
      look: [
        { text: '閉め切ったカーテン。隙間から、中庭の向こうの5階が見える。' },
        { text: '503号室の窓だけ、カーテンが少し開いている気がした。' },
      ],
    },
    {
      id: 'bookshelf', label: '本棚', class: 'spot-emptyshelf', x: 34, y: 10, w: 16, h: 44,
      look: [{ text: '空っぽの本棚。棚板に、本が並んでいた跡だけが残っている。' }],
    },
    {
      id: 'letter', label: '封筒', class: 'spot-letter', x: 50, y: 52, w: 8, h: 7, solved: true,
      look: [{ text: '封筒の表に、几帳面な字で「これを読んでいる方へ」。' }],
      item: 'letter',
      hideWhenTaken: true,
    },
    {
      id: 'closet', label: 'クローゼット', class: 'spot-closet', x: 56, y: 8, w: 16, h: 50,
      look: [{ text: 'クローゼットの中には、ハンガーが並んでいるだけだ。' }],
    },
    { id: 'pc', label: '管理人室へ', class: 'spot-door', x: 82, y: 14, w: 14, h: 46, go: 'pc' },
  ],
};

// 持ち物。paper は紙を読む、notebook は日向のノートを開く
export const ITEMS = {
  techo: {
    name: '日向の手帳',
    desc: '管理人室の机の引き出しにあった。PCのパスワードのヒントが書いてある。',
    paper: {
      title: '日向の手帳',
      lines: [
        '5/20　入退室ログ、時計ずれ修正（1時間）',
        '6/2　　後任の件、まだ決まらないらしい',
        '6/12　引き継ぎ資料 → 間に合わない。ノートで勘弁',
        '6/19　最終日',
        '',
        'PCのパス：俺の最終日（4桁）',
      ],
    },
  },
  notebook: {
    name: 'SQLノート',
    desc: '日向が後輩のために手書きで残したSQLのノート。',
    notebook: true,
  },
  notice: {
    name: '管理室からのお知らせ',
    desc: '205号室のポストに入っていた。佐伯さんの住人番号が書いてある。',
    paper: {
      title: '管理室からのお知らせ',
      lines: [
        'カードキー電池交換のお知らせ',
        '',
        '205号室　佐伯 悠 様（住人番号：12）',
        '',
        'お持ちのカードキーの電池交換時期が近づいています。',
        '管理人室の窓口までお持ちください。',
        '',
        '8月25日　ひだまりレジデンス管理室',
      ],
    },
  },
  letter: {
    name: '佐伯の手紙',
    desc: '205号室の机の上にあった封筒。「これを読んでいる方へ」。',
    paper: 'letter',
  },
};

// 第7章で読む、佐伯の手紙
export const PAPERS = {
  letter: {
    title: '佐伯の手紙',
    lines: [
      'これを読めているなら、あなたは私を名簿に戻してくれた人ですね。',
      'ありがとうございます。佐伯です。無事でいます。',
      '',
      '長く経理をしていたので、合わない数字は気になる性分です。',
      'この建物は、住んでいる人の数と、家賃の補助を受けている人の数が合いません。',
      '調べているうちに、調べていることを知られました。',
      '夜、部屋の前に人が立つようになりました。',
      '',
      '私の手元にあるのは写しだけです。これでは誰も動いてくれないでしょう。',
      'けれど、この建物の記録は、消しても書き換えても、どこかに跡が残るようです。',
      'そういう仕組みを入れてくれた人がいたのだと思います。',
      'だから証拠は持ち出さず、ここに置いていきます。',
      '',
      'あなたはもう、ほとんど見つけているはずです。',
      '最後は、誰がやったのかを、記録そのものに答えさせてください。',
      '',
      '私は遠くにはいません。',
      '誰も住んでいない部屋は、この建物には案外たくさんありますから。',
      '',
      '　　　　　　　　　　　　　　　　佐伯',
    ],
  },
};

export const PASSWORD = '0619';

export const MEMO_TXT = `DBは嘘をつく。でも、DBは忘れない。　―日向

後任へ
・ターミナルを開いたら、まず .tables
・中身を見るなら SELECT * FROM テーブル名;
・最後の ; を忘れるな。忘れると、いつまでも続きを待たれる
・分からなくなったらノートを見ろ。本棚にある`;

// メール。time は物語上の時刻。null のときは受信した時点の時計を使う
export const MAILS = {
  m1: {
    from: '桐山',
    subject: '205号室のこと',
    time: '9:20',
    body: (name) => `${name}さん

先ほどはありがとうございました。
まず、205号室がいま名簿上どうなっているかを確認してもらえますか。
誰が登録したのかも分かると助かります。

名簿や出入りの記録は、そのパソコンの中のデータベースに入っているそうです。
日向さんはいつも、デスクトップの「ターミナル」という黒い画面に
SQLという命令を打ち込んで、記録を調べていました。

それと、日向さんが辞める日に「後任のために、SQLのノートを本棚に置いていく」と言っていました。
私が見てもさっぱりでしたが、「はじめに」から順に読めば分かるようにしてある、とも。
名簿から1部屋だけ探すやり方も、最初の方に書いてあるかもしれません。

分かったら、このメールに返信してください。
困ったときは「桐山に相談」から連絡をください。

桐山`,
    report: 1,
  },
  m1_ok: {
    from: '桐山',
    subject: 'Re: 205号室のこと',
    time: null,
    body: (name) => `${name}さん

登録したのは柳田さん、ですか。
入居日が9月8日。佐伯さんが出かけたきりになった、次の日ですね。

すぐに電話します。

桐山`,
  },
  m2: {
    from: '桐山',
    subject: '最後に見かけたのは',
    time: null,
    body: (name) => `${name}さん

電話でお話ししたことを、念のためメールでも送っておきます。

佐伯さんが最後に建物を出たのがいつか、調べてもらえますか。
柳田さんは「9月7日の夕方に出て行ったきり」と言っていました。

最後の記録を探すなら、記録を新しい順に並べられたら早そうですね。
日向さんのノートに、並べ方は載っていませんでしたか。

ほかに気になる記録があれば、それも教えてください。

桐山`,
    report: 2,
  },
  m2_ok: {
    from: '桐山',
    subject: 'Re: 最後に見かけたのは',
    time: null,
    body: (name) => `${name}さん

17時58分。柳田さんの話と同じですね。
でも、小野寺さんは21時半に明かりを見ている。

桐山`,
  },
  m3: {
    from: '桐山',
    subject: '番号12のこと',
    time: null,
    body: (name) => `${name}さん

番号12が名簿にないのは、やはりおかしいと思います。

入退室の記録と名簿を突き合わせて、
ほかにも食い違いがないか見てもらえますか。

・記録にはいるのに、名簿にいない番号
・名簿にはいるのに、記録が1件もない住人の数

この2つを教えてください。

一覧を目で見比べていたら、日が暮れてしまいそうです。
日向さんのノートに、2つの表を突き合わせるやり方は書いてありませんか。

桐山`,
    report: 3,
  },
  m3_ok: {
    from: '桐山',
    subject: 'Re: 番号12のこと',
    time: null,
    body: (name) => `${name}さん

10人。そんなにいるんですね。

103号室の西川さんは、入院中だと聞いています。
205の「不明」は、さっきの行ですね。

でも、残りの8人は……5階と、4階の角部屋？
オーナーの台帳では、そこは全部空室のはずです。

誰も住んでいない部屋に、住人がいることになっている。

桐山`,
  },
  m4: {
    from: '桐山',
    subject: '17時58分と21時半',
    time: null,
    body: (name) => `${name}さん

17時58分と21時半、どちらが本当なのか。
記録のほうが書き換えられているなら、それが開ける理由になります。

日向さんは、何か仕組みを残していないでしょうか。
もし書き換えられていたら、元の値に戻してください。
戻ったのを確かめたら、私の権限で205を開けます。

桐山`,
  },
  m4_ok: {
    from: '桐山',
    subject: 'Re: 17時58分と21時半',
    time: null,
    body: (name) => `${name}さん

記録、確かめました。
佐伯さんが最後に出たのは、23時12分。
誰かが、それを17時58分に書き換えていた。

今から205を開けます。

桐山`,
  },
  m5: {
    from: '桐山',
    subject: '明日の朝までに',
    time: null,
    body: (name) => `${name}さん

オーナーに確かめました。
市の家賃補助の申請は、明日の朝9時に自動で出ることになっています。
名簿に入居者として載っている人の分が、まとめて申請されるそうです。

架空の住人が名簿に残っていると、また申請されてしまいます。
その前に、名簿から外してもらえますか。

オーナーには、台帳も見てもらいました。
5階の6部屋と、4階の401・406は、ずっと空室だそうです。
鍵も、誰にも渡したことがないと。
空室かどうかは、管理システムの部屋の一覧にも入れてあるそうです。

名簿では住んでいることになっているのに、部屋は空室になっている。
そういう人が本当にいるのか、外す前に一度確かめて、教えてください。

本当に住んでいる方は、絶対に消さないでください。

それと、分かればでいいのですが、
外した人たちを誰が登録していたのかも教えてください。

桐山`,
    report: 5,
  },
  m5_ok: {
    from: '桐山',
    subject: 'Re: 明日の朝までに',
    time: null,
    body: (name) => `${name}さん

名簿から8人が外れたのを確認しました。
これで、明日の申請は止まります。ありがとうございました。

桐山`,
  },
  m6: {
    from: '桐山',
    subject: '補助金の振込先',
    time: null,
    body: (name) => `${name}さん

これまでに申請されてきた分が、どこに振り込まれていたのか。
家賃補助の振込先を確認してもらえますか。
正規の管理口座は 1182034 です。
それ以外の口座があれば、番号を教えてください。
分かれば、そこに振り込まれた合計の金額も。

それと、お願いがあります。
この件は、まだ警察には言わないでください。

桐山`,
    report: 6,
  },
  m6_ok: {
    from: '桐山',
    subject: 'Re: 補助金の振込先',
    time: null,
    body: (name) => `${name}さん

4470918。この口座の名義を、銀行に照会してみます。

さっきは、警察に言わないでと書いてすみません。
オーナーはもう高齢で、確かなことが分かるまでは騒ぎにしたくない、と。
日向さんが辞めたときも、私は何もできませんでした。
今度こそ、確かめてからにしたいんです。

そういえば、名簿から外した8人は、どこに行ったんでしょう。
消えてなくなったわけでは、ないんですよね？

桐山`,
  },
  m7: {
    from: '桐山',
    subject: '外した8人のこと',
    time: null,
    body: (name) => `${name}さん

名簿から外した8人の行は、どこかに残っていたりしないでしょうか。

もし、消された行がどこかに残る仕組みがあるなら、
名簿から消された佐伯さんの行も、残っているかもしれません。

見つかったら、佐伯さんを名簿に戻してあげてください。
戻すのは、佐伯さんだけです。

桐山`,
  },
  m7_ok: {
    from: '桐山',
    subject: 'Re: 外した8人のこと',
    time: null,
    body: (name) => `${name}さん

名簿に、佐伯さんの名前が戻りました。
……205の部屋、見てきてもらえますか。

桐山`,
  },
  m8: {
    from: '桐山',
    subject: '最後のお願い',
    time: null,
    body: (name) => `${name}さん

明日の朝、オーナーと一緒に警察に相談します。

そのときに、誰がやったのかを、記録そのものに答えさせたいんです。
名前を1つだけ返すクエリを書いて、そのまま実行してください。

条件は2つです。
・架空の住人を登録した人であること
・出入りの記録を書き換えた人であること

名前を直接書くのはなしです。記録に言わせてください。

桐山`,
  },
  m8_ok: {
    from: '桐山',
    subject: 'Re: 最後のお願い',
    time: null,
    body: (name) => `${name}さん

柳田さん。
……記録が、そう答えたんですね。

ありがとうございます。
明日、これを持っていきます。

桐山`,
  },
  m9: {
    from: '桐山',
    subject: '今日のこと',
    time: null,
    body: (name) => `${name}さん

今日分かったことを、最後にひとつにまとめておいてもらえますか。
明日の朝、それを持っていきます。

本当に、長い一日でした。

桐山`,
  },
};

// エピローグ。truth は lies ビューの結果（4行、確保できなかった証拠は null）
export const EVIDENCE_NAMES = ['入退室の記録', '架空の住人の登録者', 'お金の流れ', '佐伯さんの記録'];

export const TRUE_END = {
  lines: [
    '翌朝、桐山さんとオーナーは、集めた記録を持って警察に向かった。',
    '昼過ぎ、桐山さんから短いメールが届いた。',
    '「柳田さんは、警察で話を聞かれているそうです。記録は全部渡しました。ありがとうございました。」',
    '',
    '数日後。',
  ],
  terminal: [
    { sql: "SELECT name, room_no FROM residents WHERE resident_id = 12;", rows: [['佐伯 悠', '205']] },
    { sql: 'SELECT action, logged_at FROM access_log WHERE resident_id = 12 ORDER BY logged_at DESC LIMIT 1;', rows: [['IN', '2026-10-02 18:40']] },
  ],
  mail: { from: '日向', subject: '（件名なし）', body: '言ったろ。DBは忘れない。' },
  title: 'TRUE END',
};

export const NORMAL_END = {
  lines: [
    '翌朝、桐山さんとオーナーは、集めた記録を持って警察に向かった。',
    'けれど、記録には空欄があった。',
    '柳田は「入力ミスでしょう」と笑い、今日も管理人室に座っている。',
  ],
  title: 'NORMAL END',
  retry: '空欄になった行は、まだ埋められるかもしれない。',
};

// 全角数字を半角にして、数字だけを取り出す
// 「342万円」「3,420,000円」などを数値にする
const yen = (s) => {
  const t = (s ?? '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[,，\s円]/g, '');
  const m = t.match(/^(\d+(?:\.\d+)?)(万)?$/);
  return m ? Math.round(Number(m[1]) * (m[2] ? 10000 : 1)) : NaN;
};
const digits = (s) => (s ?? '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, '');

export const REPORTS = {
  1: {
    fields: [{ id: 'staff', label: '205号室を登録した職員の名前' }],
    check: (a) => /柳田|やなぎだ|ヤナギダ/.test(a.staff),
    ng: '記録を見る限り、その方ではないようです。もう一度確認してもらえますか。',
    okMail: 'm1_ok',
  },
  2: {
    fields: [
      { id: 'time', label: '佐伯さんが最後に建物を出た時刻' },
      { id: 'witness', label: 'それと食い違う記録を残している人' },
    ],
    check: (a) => digits(a.time).endsWith('1758') && /小野寺|おのでら|オノデラ/.test(a.witness),
    ng: 'うーん、どこかが記録と合わないみたいです。もう一度見てもらえますか。',
    okMail: 'm2_ok',
  },
  3: {
    fields: [
      { id: 'orphan', label: '記録にはいるのに、名簿にいない番号' },
      { id: 'silent', label: '名簿にはいるのに、記録が1件もない住人の数' },
    ],
    check: (a) => digits(a.orphan) === '12' && digits(a.silent) === '10',
    ng: '私が数えたのと少し違うかもしれません。もう一度確かめてもらえますか。',
    okMail: 'm3_ok',
  },
  // evidence 付きの項目は任意。章クリアには関係せず、証拠の確保だけに使う
  5: {
    fields: [{
      id: 'staff', label: '外した住人を登録していた職員（分かれば）', evidence: 'e2',
      check: (v) => /柳田|やなぎだ|ヤナギダ/.test(v),
    }],
    ng: '私の見た記録とは違うようです。外した人たちの行は、どこかに残っていないでしょうか。',
    thanks: 'ありがとうございます。覚えておきます。',
  },
  6: {
    fields: [
      { id: 'account', label: '正規の管理口座以外の振込先の口座番号' },
      {
        id: 'total', label: 'その口座に振り込まれた合計の金額（分かれば）', evidence: 'e3',
        check: (v) => yen(v) === 3420000,
        ng: 'その金額は、私が計算したのと合わないようです。',
      },
    ],
    check: (a) => digits(a.account) === '4470918',
    ng: 'その番号では、振込の記録が見つからないようです。',
    okMail: 'm6_ok',
    thanks: 'ありがとうございます。覚えておきます。',
  },
};

export const HINTS = {
  1: [
    '住人の情報は、名簿のテーブルにまとまっているはずです。205号室の行を探してみてください。',
    'WHERE で部屋番号を絞れるそうです。登録した人は番号で入っていて、職員の一覧は別のテーブルにあるみたいです。',
    "SELECT * FROM residents WHERE room_no = '205'; で出てくる registered_by の番号を、SELECT * FROM staff; の一覧と見比べてみてください。",
  ],
  2: [
    '名簿の205の番号で記録を探しても、何も出てこないかもしれません。佐伯さん本人の番号が分かるものが、エントランスに残っていないでしょうか。',
    '佐伯さんの番号で出入りの記録を絞って、新しい順に並べれば、最後の記録がいちばん上に来るはずです。メモ欄も、部屋番号で絞れると思います。',
    "SELECT * FROM access_log WHERE resident_id = 12 ORDER BY logged_at DESC LIMIT 1; と、SELECT * FROM memos WHERE room_no = '205'; を試してみてください。",
  ],
  3: [
    '片方の表にしかない番号を探す、ということですね。日向さんのノートに「相手がいない行」というページがありませんでしたか。',
    'LEFT JOIN すると、相手がいない行は NULL になるそうです。記録から名簿へ、名簿から記録へ、両方向で試してみてください。',
    'SELECT DISTINCT a.resident_id FROM access_log a LEFT JOIN residents r ON r.resident_id = a.resident_id WHERE r.resident_id IS NULL; と、SELECT r.* FROM residents r LEFT JOIN access_log a ON a.resident_id = r.resident_id WHERE a.log_id IS NULL; です。',
  ],
  4: [
    '日向さんの手帳と、ノートの最後のページをもう一度読んでみてください。「前の値が残る」と書いてあった気がします。',
    '.tables の中に、変更の履歴らしい表がありませんか。書き換える前の値が残っていれば、UPDATE で元に戻せます。',
    "SELECT * FROM audit_log WHERE table_name = 'access_log'; で書き換えを探して、UPDATE access_log SET logged_at = '（old_value の値）' WHERE log_id = （record_id の値）; です。",
  ],
  5: [
    '外す前に、その人たちが本当に住んでいないか確かめたいです。空室かどうかは、管理システムの部屋の一覧（rooms）に入っているそうです。',
    "名簿（residents）と部屋の一覧（rooms）を、部屋番号でつなげてみてください。名簿にいるのに、部屋は空室（status が 'vacant'）になっている人が、架空の住人です。記録が1件もない人の中には、入院中の西川さんも、205の「不明」もいるので、記録だけで決めないでください。",
    "SELECT r.* FROM residents r JOIN rooms ro ON ro.room_no = r.room_no WHERE ro.status = 'vacant'; で8人を確かめてから、DELETE FROM residents WHERE room_no IN (SELECT room_no FROM rooms WHERE status = 'vacant'); です。",
  ],
  6: [
    '入金の記録は rent_payments にあるはずです。振込先の口座ごとにまとめてみると、何か見えるかもしれません。日向さんのノートの「まとめる」のページが使えそうです。',
    'GROUP BY account_no で口座ごとにまとめて、COUNT や SUM を出してみてください。補助金だけに絞るなら payer で。',
    "SELECT account_no, COUNT(DISTINCT resident_id), SUM(amount) FROM rent_payments WHERE payer = '市補助' GROUP BY account_no; です。",
  ],
  7: [
    '日向さんのノートの最後のページに「消したら捨て場に行く」とありました。.tables をもう一度見てみてください。',
    '捨て場の表から佐伯さんの行だけを選んで、名簿に INSERT します。ノートの「書き換える」のページに、別の表からコピーするやり方がありました。列の数が違うので、列を指定してください。',
    'INSERT INTO residents (resident_id, name, room_no, moved_in_on, phone, registered_by) SELECT resident_id, name, room_no, moved_in_on, phone, registered_by FROM residents_trash WHERE resident_id = 12; です。',
  ],
  8: [
    '条件は2つです。架空の住人を登録した人と、出入りの記録を書き換えた人。それぞれ、どの表を見れば分かるでしょう。',
    '外した8人は residents_trash に、書き換えの履歴は audit_log にあります。それぞれから職員の番号を取り出して、両方に入っている人を staff から選びます。IN を2つ、AND でつなげてください。',
    "SELECT name FROM staff WHERE staff_id IN (SELECT registered_by FROM residents_trash WHERE resident_id NOT IN (SELECT resident_id FROM access_log)) AND staff_id IN (SELECT changed_by FROM audit_log WHERE table_name = 'access_log'); です。",
  ],
  9: [
    '.tables を見てみてください。見覚えのない名前があるはずです。',
    'lies というビューに、truth という列があるようです。',
    'SELECT truth FROM lies; です。',
  ],
};

// クエリの結果を見て、主人公が一言つぶやく。chapter を付けたものはその章でだけ出る
const cellsOf = (outputs) => outputs.filter((o) => o.type === 'table').flatMap((o) => o.values.flat());
const anyCell = (outputs, test) => cellsOf(outputs).some((v) => typeof v === 'string' && test(v));
const hasColumns = (outputs, ...names) => outputs.some((o) => o.type === 'table' && names.every((n) => o.columns.includes(n)));

// 架空の住人8人（部屋の一覧では、どの部屋も空室）と、名簿に載っている全員
const GHOST_NAMES = ['高橋 誠', '吉田 浩', '山口 明', '斎藤 学', '井上 実', '木村 茂', '林 清', '清水 豊'];
const ALL_RESIDENTS = [
  '田村 和夫', '西川 フミ', '岡本 直樹', '藤井 美咲', '森下 敏行', '石原 加奈', '中野 浩二', '松井 由香',
  '小川 達也', '上田 沙織', '青木 健太', '原 智子', '菊地 大輔', '金子 真理', '新井 翔太', '不明', ...GHOST_NAMES,
];

// 出入りの記録がある、本物の住人（この人たちが混ざった結果は、まだ絞り込めていない）
const REAL_WITH_LOGS = ['田村 和夫', '岡本 直樹', '藤井 美咲', '森下 敏行', '石原 加奈'];

// outputs は画面に表示された行だけ。表示しきれなかった表には truncated が付く。
// after を付けたものは、その気づきが出た後でだけ出る
export const MONOLOGUES = [
  // 番号で表どうしがつながっていることに、少しずつ気づかせる。focus の列を、話しているあいだ枠で囲む
  {
    id: 'idResidents',
    focus: 'resident_id',
    when: (outputs) => hasColumns(outputs, 'resident_id', 'registered_by'),
    text: 'resident_id……住人ひとりひとりに振られた番号、かな。',
  },
  {
    id: 'idResidents2',
    after: 'idResidents',
    focus: 'registered_by',
    when: (outputs) => hasColumns(outputs, 'resident_id', 'registered_by'),
    text: 'registered_by は「登録した人」のはずだけど、名前じゃなくて数字が入っている。',
  },
  {
    id: 'idResidents3',
    after: 'idResidents2',
    focus: 'registered_by',
    when: (outputs) => hasColumns(outputs, 'resident_id', 'registered_by'),
    text: 'これも、誰かの番号なのかな。職員の一覧が、どこか別の表にあったりするんだろうか。',
  },
  {
    id: 'idStaff',
    after: 'idResidents',
    focus: 'staff_id',
    when: (outputs) => hasColumns(outputs, 'staff_id', 'role'),
    text: 'staff_id。職員ごとの番号だ。……やっぱり、名簿の registered_by の数字は、この番号のことだったんだ。',
  },
  {
    id: 'idStaff2',
    after: 'idStaff',
    focus: 'staff_id',
    then: 'joinDemo',
    when: (outputs) => hasColumns(outputs, 'staff_id', 'role'),
    text: '同じ番号を目印にすれば、別々の表をつなげて読める。日向さんのノートの「つなぐ」は、たぶんこのことだ。',
  },
  {
    id: 'idAccessLog',
    after: 'idResidents',
    focus: 'resident_id',
    when: (outputs) => hasColumns(outputs, 'resident_id', 'logged_at'),
    text: '出入りの記録にも resident_id がある。名簿と同じ番号なら、誰の出入りか分かるはずだ。',
  },
  {
    id: 'idStaffLog',
    after: 'idStaff',
    focus: 'staff_id',
    when: (outputs) => hasColumns(outputs, 'staff_id', 'logged_at'),
    text: 'こっちは staff_id で記録されている。職員の出入りの記録みたいだ。',
  },
  {
    id: 'idPayments',
    after: 'idResidents',
    focus: 'resident_id',
    when: (outputs) => hasColumns(outputs, 'resident_id', 'payer'),
    text: 'ここにも resident_id。名簿とつなげれば、誰の分の入金か分かりそうだ。',
  },
  {
    id: 'idAudit',
    after: 'idStaff',
    focus: 'changed_by',
    when: (outputs) => hasColumns(outputs, 'changed_by', 'record_id'),
    text: 'changed_by も数字だ。これも職員の番号なのかな。',
  },
  {
    id: 'truncatedLog',
    when: (outputs) => outputs.some((o) => o.truncated && o.columns.includes('resident_id') && o.columns.includes('logged_at')),
    text: '記録が多すぎて、全部は表示しきれていない。いちばん新しい記録は、見えない下の方だ。',
    then: 'sortLesson',
  },
  {
    id: 'truncated',
    when: (outputs) => outputs.some((o) => o.truncated && !(o.columns.includes('resident_id') && o.columns.includes('logged_at'))),
    text: '行が多すぎて、全部は表示しきれていない。WHERE で絞るか、ORDER BY と LIMIT で見る行を選んだほうがよさそうだ。',
  },
  {
    id: 'unknown205',
    focusRow: '不明',
    when: (outputs) => cellsOf(outputs).includes('不明'),
    text: '……205号室だけ、名前がない。',
  },
  {
    id: 'last1758',
    focusRow: '2026-09-07 17:58',
    chapter: 2,
    when: (outputs) => cellsOf(outputs).includes('2026-09-07 17:58'),
    text: '9月7日、17時58分。夕方に出て、それきりになっている。',
  },
  {
    id: 'light2130',
    focusRow: '21時半',
    when: (outputs) => anyCell(outputs, (v) => v.includes('21時半')),
    text: '……21時半に、明かり？',
  },
  {
    id: 'fifthFloor',
    chapter: 3,
    when: (outputs) => {
      const cells = cellsOf(outputs);
      return ['高橋 誠', '吉田 浩', '山口 明', '井上 実'].every((name) => cells.includes(name))
        && !REAL_WITH_LOGS.some((name) => cells.includes(name));
    },
    text: '5階の住人が、誰ひとり出入りしていない。',
  },
  {
    id: 'audit2312',
    focusRow: '2026-09-07 23:12',
    when: (outputs) => cellsOf(outputs).includes('2026-09-07 23:12'),
    text: '23時12分……？　17時58分は、書き換えられた値だ。',
  },
  {
    id: 'audit2341',
    focusRow: '2026-09-07 23:41',
    when: (outputs) => cellsOf(outputs).includes('2026-09-07 23:41'),
    text: '同じ朝に、同じ人がもう1件、書き換えている……？',
  },
  {
    id: 'ghostsConfirmed',
    chapter: 5,
    focus: 'status',
    when: (outputs, sql) => {
      const names = cellsOf(outputs).filter((v) => ALL_RESIDENTS.includes(v));
      const exact = GHOST_NAMES.every((n) => names.includes(n)) && names.every((n) => GHOST_NAMES.includes(n));
      const vacantShown = outputs.some((o) => o.type === 'table' && o.columns.includes('status')
        && o.values.length && o.values.every((row) => row[o.columns.indexOf('status')] === 'vacant'));
      return exact && (vacantShown || (/\brooms\b/i.test(sql) && /vacant/i.test(sql)));
    },
    text: '名簿では住んでいることになっているのに、部屋は空室。……ちょうど8人だ。',
    then: 'ghostsConfirmed',
  },
  {
    id: 'ghostDates',
    chapter: 5,
    when: (outputs) => {
      const cells = cellsOf(outputs);
      return ['2024-04-01', '2025-11-01', '2026-06-01'].every((d) => cells.includes(d))
        && !REAL_WITH_LOGS.some((name) => cells.includes(name));
    },
    text: '記録のない住人の入居日が、どれも「1日」になっている……？',
  },
];

MONOLOGUES.push(
  {
    id: 'account',
    focusRow: '4470918',
    chapter: 6,
    when: (outputs) => cellsOf(outputs).includes('4470918'),
    text: '正規の口座じゃない番号が、混ざっている。',
  },
  {
    id: 'trash',
    focusRow: '佐伯 悠',
    when: (outputs) => cellsOf(outputs).includes('佐伯 悠'),
    text: '……佐伯 悠。ここにいた。',
  },
  {
    id: 'wrongSuspect',
    chapter: 8,
    when: (outputs) => {
      const table = outputs.filter((o) => o.type === 'table').pop();
      return Boolean(table) && table.values.length > 1 && table.values.every((r) => r.length === 1) && table.values.some((r) => r[0] === '柳田');
    },
    text: '名前が1つに絞れていない。条件が足りないのかもしれない。',
  },
);

// 主人公がノートを見ながら、SQLを打ってみせたり、やり方を確かめたりする場面。
// 答えそのものは出さない（JOIN の見本は101号室。205号室を登録したのは柳田、101号室は前管理人の大森）
export const SCENES = {
  joinDemo: [
    { say: [{ text: '日向さんのノートの「つなぐ」のページを、開いてみよう。' }] },
    { notebook: 'つなぐ' },
    {
      say: [
        { text: 'JOIN は、2つの表を横に並べてくっつけて、1つの表として見るための書き方らしい。' },
        { text: 'どの行とどの行をくっつけるかは、ON の後ろに書く。「こっちの表のこの列と、あっちの表のこの列が、同じ番号なら同じ行にする」という意味だ。' },
        { text: 'ノートの例だと、貸出の表（loans）には会員の番号しかなかった。そこに、会員の表（members）を member_id でくっつけて、名前を並べて見ていた。' },
        { text: '名簿なら……residents の registered_by と、staff の staff_id を、ON でつなげればいいのかな。' },
        { text: '表の名前を毎回書くと長いから、AS で residents を r、staff を s と短く呼ぶことにしよう。ノートの「別名」のところに書いてあったやり方だ。' },
        { text: 'staff の name は、名簿の name と区別がつくように、AS で staff_name と呼ぶことにする。' },
        { text: 'ただ、このままだと全部の部屋が出てくる。205号室を見る前に、まずは試しに101号室だけでやってみたい。' },
        { text: '1部屋だけに絞るやり方は……「絞る」のページだ。' },
      ],
    },
    { notebook: '絞る' },
    {
      say: [
        { text: 'WHERE の後ろに条件を書くと、その条件に合う行だけが残る。room_no = 101 なら、部屋番号が101の行だけだ。' },
        { text: "ノートには「文字は ' で囲む。数字は囲まない」とある。部屋番号は、文字と数字のどっちで入っているんだろう。" },
        { text: '「はじめに」のページに、.schema で列の中身の種類が見られると書いてあった。確かめてみよう。' },
      ],
    },
    { type: '.schema residents' },
    {
      say: [
        { text: 'room_no の横に TEXT とある。TEXT は文字、という意味だ。resident_id のほうは INTEGER、整数だ。' },
        { text: "部屋番号は文字として入っている。だから '101' と ' で囲んでおこう。" },
        { text: 'WHERE は、JOIN でくっつけた後の表に効く。だから JOIN の後ろ、文のいちばん最後に付ければいい。' },
        { text: 'r.room_no の r は、さっき residents に付けた呼び名だ。名簿の部屋番号、という意味になる。' },
        { text: 'よし、打ってみよう。' },
      ],
    },
    {
      type: `SELECT r.room_no, r.name, s.name AS staff_name
FROM residents AS r
JOIN staff AS s ON s.staff_id = r.registered_by
WHERE r.room_no = '101';`,
    },
    {
      focus: 'staff_name',
      say: [
        { text: '出た。registered_by の番号の代わりに、staff の名前が並んでいる。' },
        { text: '101号室の田村さんを登録したのは、大森さん。前の管理人さんだ。' },
        { text: "WHERE の '101' を変えれば、ほかの部屋も同じように調べられるはずだ。" },
      ],
    },
  ],
  // 第5章：空室の部屋にいる8人を出したら、桐山さんに電話して、架空の住人だと確かめる
  ghostsConfirmed: [
    {
      // 5階の廊下に行ったあと（着いたときの地の文が流れたあと）だけ
      if: (st) => st.chapter === 5 && st.pendingIntro !== 5,
      say: [{ text: '5階のドアは、どれも表札がなかった。ドアノブには埃が積もっていて、人が出入りしている様子もなかった。' }],
    },
    {
      say: [
        { text: '出入りの記録も、この8人は1件もない。' },
        { text: '桐山さんに電話をかけて、8人の部屋番号を読み上げた。' },
        { who: '桐山（電話）', text: '……501から506、それに401と406。オーナーの台帳の空室と、ぴったり同じです。' },
        { who: '桐山（電話）', text: '鍵を渡したこともない部屋に、住んでいる人はいません。その8人は、架空の住人です。' },
        { who: '桐山（電話）', text: '名簿から外してください。……本当に住んでいる方は、そのままで。' },
        { text: '電話が切れた。同じ条件で、この8人だけを名簿から外せばいい。' },
      ],
    },
    { flag: 'ghostsConfirmed' },
  ],
  // 出入りの記録を全部出したら、表示しきれなかったとき
  sortLesson: [
    { say: [{ text: '並べ替えのやり方が、日向さんのノートにあったはずだ。' }] },
    { notebook: '並べる' },
    {
      say: [
        { text: 'ORDER BY の後ろに列の名前を書くと、その列の順に並べ替えてくれる。' },
        { text: '何も付けなければ、小さい順（昇順）。日付や時刻なら、古い順だ。' },
        { text: '後ろに DESC を付けると、大きい順（降順）。日付や時刻なら、新しい順になる。' },
        { text: 'それに LIMIT を付けると、並べ替えた後の上から何行だけを出せる。新しい順に並べて LIMIT 1 なら、いちばん新しい1件だけだ。' },
        { text: '出入りの記録なら、logged_at が日時だ。これを新しい順に並べれば、最後の記録がいちばん上に来る。' },
        { text: 'ただ、全員分のままだと、ほかの人の記録に埋もれてしまう。先に WHERE で、調べたい人の番号に絞っておかないと。' },
        { text: 'WHERE → ORDER BY → LIMIT の順に書く。ノートにも、そう書いてある。' },
      ],
    },
  ],
};

// ターミナルの列名にマウスを乗せると出る説明
export const COLUMN_NOTES = {
  resident_id: '住人ごとの番号。名簿（residents）と同じ番号で、ほかの表とつながる',
  registered_by: 'その住人を登録した職員の番号。staff の staff_id と対応',
  staff_id: '職員ごとの番号。residents の registered_by などと対応',
  room_no: "部屋番号（文字なので '205' のように囲む）",
  floor: '階',
  status: 'occupied＝入居中、vacant＝空室',
  moved_in_on: '入居日',
  phone: '電話番号',
  log_id: '記録1件ごとの番号',
  action: 'IN＝入った、OUT＝出た',
  logged_at: '記録された日時',
  changed_by: '書き換えた職員の番号。staff の staff_id と対応',
  record_id: '書き換えられた行の番号。table_name の表の、行ごとの番号（log_id など）と対応',
  table_name: '書き換えられた表の名前',
  column_name: '書き換えられた列の名前',
  old_value: '書き換える前の値',
  new_value: '書き換えた後の値',
  changed_at: '書き換えた日時',
  payer: '払った人（本人／市補助）',
  account_no: '振込先の口座番号',
  amount: '金額（円）',
  month: '何月分か',
  deleted_at: '消された日時',
};

// 実行した文を見て、主人公が一言つぶやく（WHERE忘れなど）
export const STATEMENT_MONOLOGUES = [
  {
    when: (st) => st.kind === 'UPDATE' && st.changes > 1 && /access_log/i.test(st.sql),
    text: '……何行も書き換わった。「章の最初に戻す」で、やり直したほうがいい。',
  },
];

// 日向のSQLノート。例題は図書館の貸出DB（ゲームの謎とは無関係な題材）。
// 例の結果は、BOOKS / MEMBERS / LOANS の中身で実際に実行したときのものに合わせてある

// 結果の表を描く。null は NULL と表示する
const tbl = (cols, rows) => `<table class="nb-table"><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>${
  rows.map((r) => `<tr>${r.map((v) => (v === null ? '<td class="null">NULL</td>' : `<td>${v}</td>`)).join('')}</tr>`).join('')}</table>`;

const BOOKS = tbl(['book_id', 'title', 'author', 'shelf', 'price'], [
  [1, 'こころ', '夏目漱石', 'A', 600],
  [2, '坊っちゃん', '夏目漱石', 'A', 500],
  [3, '銀河鉄道の夜', '宮沢賢治', 'B', 700],
  [4, '羅生門', '芥川龍之介', 'B', 450],
  [5, '吾輩は猫である', '夏目漱石', 'A', 900],
]);
const MEMBERS = tbl(['member_id', 'name', 'joined_on'], [
  [1, '佐藤', '2019-04-10'],
  [2, '鈴木', '2021-07-01'],
  [3, '田中', '2023-02-15'],
]);
const LOANS = tbl(['loan_id', 'book_id', 'member_id', 'lent_on', 'returned_on'], [
  [101, 1, 1, '2026-05-02', '2026-05-10'],
  [102, 3, 2, '2026-05-08', null],
  [103, 5, 1, '2026-05-15', null],
  [104, 2, 1, '2026-05-20', '2026-05-27'],
  [105, 4, 9, '2026-05-22', '2026-05-30'],
]);

export const NOTEBOOK = [
  {
    title: '表紙',
    html: `
<div class="nb-cover">
  <p class="nb-cover-title">SQLメモ</p>
  <p class="nb-cover-name">日向</p>
  <p class="scribble" style="--r:-6deg">後輩用。字が汚いのは気にするな</p>
  <p class="scribble" style="--r:4deg">読んだら本棚に戻せ</p>
</div>`,
  },
  {
    title: '目次',
    html: `<h2>目次</h2>
<p>上から順に読めば、だいたい何でも調べられるようになる。</p>
<ol class="nb-toc"></ol>
<p class="scribble" style="--r:-2deg">例は全部、図書館の貸出の表で書いた。仕事のデータで練習すんなよ</p>`,
  },
  {
    title: 'はじめに',
    html: `
<h2>はじめに　表とターミナル</h2>
<p>データベースの中身は、<b>テーブル（表）</b>の集まり。エクセルのシートが何枚もあるようなもんだ。</p>
<p>たとえば、本の一覧の表 <code>books</code> はこう。</p>
${BOOKS}
<p>横1行が1冊分（<b>行</b>、レコード）。縦1列が項目（<b>列</b>、カラム）。<code>book_id</code> は本ごとの番号で、ほかの表から本を指すときに使う。</p>
<h3>ターミナルでの最初の一歩</h3>
<pre class="code">.tables          -- どんな表があるか一覧を出す
.schema books    -- books にどんな列があるか見る</pre>
<p>点（.）で始まるのはターミナル用の命令。そのまま Enter でいい。</p>
<p><code>.schema</code> を打つと、列の名前の横に<b>中身の種類</b>が出る。</p>
<pre class="code">CREATE TABLE books (
  book_id INTEGER,   -- INTEGER＝整数
  title   TEXT,      -- TEXT＝文字
  ...</pre>
<p>結果の表を見ただけだと、<code>205</code> が文字か数字かは区別がつかない。迷ったら .schema で見ろ。</p>
<p>SQL の文は、最後に <code>;</code>（セミコロン）を付けてから Enter。<code>;</code> がないと「まだ続きがある」と思われて、<code>...&gt;</code> が出て待たれる。そのときは <code>;</code> だけ打って Enter すればいい。</p>
<ul>
  <li><code>SELECT</code> も <code>select</code> も同じ。大文字小文字はどっちでもいい</li>
  <li>長い文は途中で改行してもいい（Shift+Enter）</li>
  <li>↑キーで、前に打った文を呼び出せる</li>
  <li><code>--</code> から後ろはメモ（コメント）。打たなくていい</li>
</ul>
<p class="scribble" style="--r:2deg">SELECT は見るだけ。何回打っても何も壊れない。とにかく打て</p>`,
  },
  {
    title: '見る',
    html: `
<h2>見る　SELECT</h2>
<p>表の中身を見る文。形はこれだけ覚えろ。</p>
<pre class="code">SELECT 見たい列 FROM 表の名前;</pre>
<p>「<b>表の名前</b> から <b>見たい列</b> を出して」と読む。</p>
<h3>全部見る</h3>
<pre class="code">SELECT * FROM books;</pre>
<p><code>*</code> は「全部の列」。最初の1ページ目の表がそのまま出てくる。知らない表は、まずこれで中身を見る。</p>
<h3>欲しい列だけ見る</h3>
<pre class="code">SELECT title, author FROM books;</pre>
${tbl(['title', 'author'], [['こころ', '夏目漱石'], ['坊っちゃん', '夏目漱石'], ['銀河鉄道の夜', '宮沢賢治'], ['羅生門', '芥川龍之介'], ['吾輩は猫である', '夏目漱石']])}
<p>列の名前は <code>,</code>（カンマ）で区切る。並べた順に出てくる。</p>
<p class="scribble" style="--r:-3deg">SELECT truth FROM * って書けたら楽なんだけどな。書けない。だから1個ずつ調べる。</p>`,
  },
  {
    title: '絞る',
    html: `
<h2>絞る　WHERE</h2>
<p>全部の行じゃなくて、条件に合う行だけ見たいときは、後ろに <code>WHERE 条件</code> を付ける。</p>
<pre class="code">SELECT * FROM books WHERE author = '夏目漱石';</pre>
${tbl(['book_id', 'title', 'author', 'shelf', 'price'], [[1, 'こころ', '夏目漱石', 'A', 600], [2, '坊っちゃん', '夏目漱石', 'A', 500], [5, '吾輩は猫である', '夏目漱石', 'A', 900]])}
<p><b>文字は <code>'</code>（シングルクォート）で囲む。数字は囲まない。</b>日付も文字扱いだから囲む。どっちで入っているかは、.schema で TEXT（文字）か INTEGER（整数）かを見れば分かる。</p>
<pre class="code">SELECT * FROM books WHERE book_id = 3;            -- 数字
SELECT * FROM loans WHERE lent_on = '2026-05-08'; -- 日付は文字</pre>
<h3>比べ方</h3>
<table class="nb-table">
  <tr><th>書き方</th><th>意味</th></tr>
  <tr><td><code>=</code></td><td>等しい</td></tr>
  <tr><td><code>&lt;&gt;</code></td><td>等しくない</td></tr>
  <tr><td><code>&gt;</code>　<code>&lt;</code></td><td>より大きい／小さい</td></tr>
  <tr><td><code>&gt;=</code>　<code>&lt;=</code></td><td>以上／以下</td></tr>
</table>
<h3>条件を2つ以上つなぐ</h3>
<pre class="code">-- 両方に当てはまる（かつ）
SELECT * FROM books WHERE price &gt;= 600 AND shelf = 'A';   -- こころ、吾輩は猫である
-- どっちかに当てはまる（または）
SELECT * FROM books WHERE price &lt;= 500 OR shelf = 'B';    -- 坊っちゃん、銀河鉄道の夜、羅生門</pre>
<h3>一部だけ合っていればいい　LIKE</h3>
<p><code>%</code> は「ここに何文字入ってもいい」という印。</p>
<pre class="code">SELECT * FROM books WHERE title LIKE '吾輩%';   -- 「吾輩」で始まる
SELECT * FROM books WHERE title LIKE '%の%';    -- 「の」を含む
SELECT * FROM books WHERE title LIKE '%である'; -- 「である」で終わる</pre>
<h3>どれかに当てはまる　IN</h3>
<pre class="code">SELECT * FROM books WHERE book_id IN (1, 3, 5);   -- 1か3か5</pre>
<h3>空っぽの欄　IS NULL</h3>
<p>何も入っていない欄は <code>NULL</code> と表示される。まだ返していない本は、返した日が空っぽ。</p>
<pre class="code">SELECT * FROM loans WHERE returned_on IS NULL;       -- 返していない
SELECT * FROM loans WHERE returned_on IS NOT NULL;   -- 返した</pre>
<p class="scribble" style="--r:2deg">= NULL って書いて1時間溶かした。IS NULL だ</p>`,
  },
  {
    title: '並べる',
    html: `
<h2>並べる　ORDER BY / LIMIT / DISTINCT</h2>
<h3>並べ替える　ORDER BY</h3>
<pre class="code">SELECT title, price FROM books ORDER BY price;        -- 安い順（小さい順）
SELECT title, price FROM books ORDER BY price DESC;   -- 高い順（大きい順）</pre>
<p><code>DESC</code> を付けると逆向き。日付なら、付けないと古い順、付けると新しい順。</p>
<h3>上から何行だけ　LIMIT</h3>
<pre class="code">SELECT title, price FROM books ORDER BY price DESC LIMIT 1;</pre>
${tbl(['title', 'price'], [['吾輩は猫である', 900]])}
<p>「並べてから、上から1行」で、<b>いちばん○○なもの</b>が取れる。</p>
<pre class="code">-- いちばん最近の貸出
SELECT * FROM loans ORDER BY lent_on DESC LIMIT 1;</pre>
<p>WHERE と一緒に使うときは、<code>WHERE → ORDER BY → LIMIT</code> の順に書く。</p>
<pre class="code">-- 会員1番の、いちばん最近の貸出
SELECT * FROM loans WHERE member_id = 1 ORDER BY lent_on DESC LIMIT 1;</pre>
<h3>同じものを1つにまとめる　DISTINCT</h3>
<pre class="code">SELECT DISTINCT author FROM books;</pre>
${tbl(['author'], [['夏目漱石'], ['宮沢賢治'], ['芥川龍之介']])}
<p>夏目漱石が3回出ずに、1回になる。</p>
<p class="scribble" style="--r:-2deg">最後の ; 忘れんな</p>`,
  },
  {
    title: 'つなぐ',
    html: `
<h2>つなぐ　JOIN</h2>
<p>貸出の表 <code>loans</code> と、会員の表 <code>members</code> を見てみる。</p>
${LOANS}
${MEMBERS}
<p><code>loans</code> には会員の<b>番号</b>しか入っていない。誰が借りたか名前で知りたいなら、<code>members</code> の同じ番号の行と見比べることになる。</p>
<p>この「見比べ」をSQLにやらせるのが <code>JOIN</code>。</p>
<pre class="code">SELECT loans.loan_id, members.name, loans.lent_on
FROM loans
JOIN members ON members.member_id = loans.member_id;</pre>
${tbl(['loan_id', 'name', 'lent_on'], [[101, '佐藤', '2026-05-02'], [102, '鈴木', '2026-05-08'], [103, '佐藤', '2026-05-15'], [104, '佐藤', '2026-05-20']])}
<p><code>ON</code> の後ろに「どの列とどの列が同じなら、くっつけるか」を書く。<code>表の名前.列の名前</code> で、どっちの表の列かをはっきりさせる。</p>
<h3>別名を付けると短く書ける</h3>
<pre class="code">SELECT l.loan_id, m.name, l.lent_on
FROM loans AS l
JOIN members AS m ON m.member_id = l.member_id;</pre>
<p><code>loans</code> を <code>l</code>、<code>members</code> を <code>m</code> と呼ぶことにする、という意味。中身はさっきと同じ。</p>
<p class="scribble" style="--r:-4deg">同じ名前の列が両方にあるときは、どっちの表のか書かないと怒られる</p>
<p class="scribble" style="--r:3deg">……105番の貸出、結果から消えてないか？　次のページ</p>`,
  },
  {
    title: '相手がいない行',
    html: `
<h2>相手がいない行　LEFT JOIN</h2>
<p>前のページの JOIN では、<b>両方の表に相手がいる行だけ</b>が残る。</p>
<ul>
  <li>105番の貸出は、会員番号9。でも <code>members</code> に9番はいない → 消えた</li>
  <li>田中さん（3番）は一度も借りていない → そもそも出てこない</li>
</ul>
<p>相手がいなくても残したいときは <code>LEFT JOIN</code>。<b>左（FROM に書いた方）の表の行は全部残る</b>。相手がいない行は、右の表の列が <code>NULL</code> になる。</p>
<pre class="code">SELECT m.name, l.loan_id
FROM members AS m
LEFT JOIN loans AS l ON l.member_id = m.member_id;</pre>
${tbl(['name', 'loan_id'], [['佐藤', 101], ['佐藤', 103], ['佐藤', 104], ['鈴木', 102], ['田中', null]])}
<h3>相手がいない行だけ取り出す</h3>
<p>NULL になった行だけ残せば、「一度も借りていない会員」が出る。</p>
<pre class="code">SELECT m.*
FROM members AS m
LEFT JOIN loans AS l ON l.member_id = m.member_id
WHERE l.loan_id IS NULL;</pre>
${tbl(['member_id', 'name', 'joined_on'], [[3, '田中', '2023-02-15']])}
<p>反対向きもできる。左と右を入れ替えれば、「会員名簿にいない番号の貸出」が出る。</p>
<pre class="code">SELECT l.*
FROM loans AS l
LEFT JOIN members AS m ON m.member_id = l.member_id
WHERE m.member_id IS NULL;</pre>
${tbl(['loan_id', 'book_id', 'member_id', 'lent_on', 'returned_on'], [[105, 4, 9, '2026-05-22', '2026-05-30']])}
<p class="scribble big" style="--r:3deg">2つの表を目で見比べるな。SQLに見比べさせろ</p>
<p class="scribble" style="--r:-2deg">相手がいない行。だいたいそこに何かある</p>`,
  },
  {
    title: '入れ子',
    html: `
<h2>入れ子　サブクエリ</h2>
<p>SELECT の中に、もう1つ SELECT を <code>( )</code> で入れられる。<b>内側が先に動いて</b>、その結果を外側が使う。</p>
<h3>IN　内側の結果のどれかに当てはまる</h3>
<pre class="code">SELECT * FROM books
WHERE book_id IN (SELECT book_id FROM loans WHERE returned_on IS NULL);</pre>
<p>内側が先に動いて <code>(3, 5)</code> になる。つまり <code>WHERE book_id IN (3, 5)</code> と同じ。答えは、いま貸出中の銀河鉄道の夜と吾輩は猫である。</p>
<h3>NOT IN　内側の結果のどれにも当てはまらない</h3>
<pre class="code">-- 一度も借りていない会員
SELECT * FROM members
WHERE member_id NOT IN (SELECT member_id FROM loans);       -- 田中

-- 会員名簿にいない番号の貸出
SELECT * FROM loans
WHERE member_id NOT IN (SELECT member_id FROM members);     -- 105番</pre>
<p>前のページの LEFT JOIN と同じ答えが出る。書きやすい方でいい。</p>
<h3>= のときは、内側を1つに絞る</h3>
<pre class="code">-- いちばん最近貸し出した本の題名
SELECT title FROM books
WHERE book_id = (SELECT book_id FROM loans ORDER BY lent_on DESC LIMIT 1);   -- 羅生門</pre>
<h3>条件を2つ重ねる</h3>
<pre class="code">-- 「こころ」を借りたことがあって、しかも今も何か借りっぱなしの会員
SELECT name FROM members
WHERE member_id IN (SELECT member_id FROM loans WHERE book_id = 1)
  AND member_id IN (SELECT member_id FROM loans WHERE returned_on IS NULL);   -- 佐藤</pre>
<p>1個ずつ内側だけ実行して、何が返ってくるか確かめてから組み合わせると迷わない。</p>
<p class="scribble" style="--r:3deg">NOT IN の中に NULL が混ざると、何も返ってこなくなる。ハマるぞ</p>`,
  },
  {
    title: '書き換える',
    html: `
<h2>書き換える　INSERT / UPDATE / DELETE</h2>
<p>ここからは<b>表の中身が変わる</b>。見るだけの SELECT とは違う。</p>
<h3>行を足す　INSERT</h3>
<pre class="code">INSERT INTO members (member_id, name, joined_on)
VALUES (4, '中村', '2026-06-10');</pre>
<p>「members の、この列たちに、この値を入れる」。列と値は同じ順番で、同じ数だけ並べる。</p>
<h3>値を変える　UPDATE</h3>
<pre class="code">UPDATE loans SET returned_on = '2026-06-01' WHERE loan_id = 102;</pre>
<p>「loans の、loan_id が102の行の、returned_on を '2026-06-01' にする」。</p>
<h3>行を消す　DELETE</h3>
<pre class="code">DELETE FROM loans WHERE loan_id = 105;</pre>
<p class="scribble big" style="--r:-5deg">WHERE忘れんなよ。俺は一回やった。全部消えた。</p>
<p>UPDATE も DELETE も、<b>WHERE がないと全部の行</b>が対象になる。</p>
<h3>やる前に、同じ WHERE で SELECT</h3>
<pre class="code">SELECT * FROM loans WHERE loan_id = 105;   -- ① まず見る。消えていい行だけか？
DELETE FROM loans WHERE loan_id = 105;     -- ② SELECT * を DELETE に変えるだけ</pre>
<p>WHERE には、前のページまでの書き方（AND、LIKE、IN、サブクエリ）が全部使える。</p>
<h3>別の表からコピーして入れる</h3>
<p>VALUES の代わりに SELECT を書くと、別の表の行をそのまま入れられる。</p>
<pre class="code">INSERT INTO members_old (member_id, name, joined_on)
SELECT member_id, name, joined_on FROM members WHERE joined_on &lt; '2020-01-01';</pre>
<p>入れる側の列と、SELECT で出す列の、<b>数と順番をそろえる</b>。コピー元の表に余計な列があるときは、<code>*</code> を使わずに列の名前を並べる。</p>
<p class="scribble" style="--r:2deg">消す前に、同じ WHERE で SELECT して、消える行を目で見ろ</p>`,
  },
  {
    title: 'まとめる',
    html: `
<h2>まとめる　COUNT / SUM / GROUP BY</h2>
<h3>数える・足す</h3>
<pre class="code">SELECT COUNT(*) FROM loans;        -- 何行あるか → 5
SELECT SUM(price) FROM books;      -- 合計 → 3150
SELECT MAX(price) FROM books;      -- いちばん大きい値 → 900</pre>
<p>ほかに <code>AVG</code>（平均）、<code>MIN</code>（いちばん小さい値）。WHERE と一緒に使えば、絞ってから数える。</p>
<pre class="code">SELECT COUNT(*) FROM loans WHERE returned_on IS NULL;   -- 貸出中は何件 → 2</pre>
<p><code>COUNT(DISTINCT 列)</code> で、ダブりを除いた数。</p>
<pre class="code">SELECT COUNT(DISTINCT member_id) FROM loans;   -- 借りたことのある番号は何種類 → 3</pre>
<h3>グループごとに　GROUP BY</h3>
<p>「会員ごとに何件」「著者ごとに合計いくら」のように、<b>同じ値の行をひとまとめにしてから</b>数える。</p>
<pre class="code">SELECT member_id, COUNT(*) FROM loans GROUP BY member_id;</pre>
${tbl(['member_id', 'COUNT(*)'], [[1, 3], [2, 1], [9, 1]])}
<pre class="code">SELECT author, COUNT(*) AS 冊数, SUM(price) AS 合計 FROM books GROUP BY author;</pre>
${tbl(['author', '冊数', '合計'], [['夏目漱石', 3, 2000], ['宮沢賢治', 1, 700], ['芥川龍之介', 1, 450]])}
<p><code>AS 名前</code> で、結果の列に分かりやすい名前を付けられる。</p>
<h3>まとめた後で絞る　HAVING</h3>
<pre class="code">SELECT member_id, COUNT(*) FROM loans
GROUP BY member_id
HAVING COUNT(*) &gt;= 2;     -- 2冊以上借りた会員 → 1番だけ</pre>
<p><b>WHERE</b> はまとめる前の行を絞る。<b>HAVING</b> はまとめた後のグループを絞る。書く順番は <code>WHERE → GROUP BY → HAVING → ORDER BY</code>。</p>
<p class="scribble" style="--r:-3deg">WHEREとHAVINGの違い、3回聞かれた。ここに書いたからもう聞くな</p>`,
  },
  {
    title: '安全に',
    html: `
<h2>安全に　トランザクション</h2>
<p>書き換えが怖いときは、先に <code>BEGIN;</code> と打っておく。そこから先の書き換えは<b>仮の状態</b>になる。</p>
<pre class="code">BEGIN;                         -- ここから仮
DELETE FROM loans WHERE returned_on &lt; '2026-05-15';
SELECT * FROM loans;           -- 思ったとおりか確かめる
ROLLBACK;                      -- 違った。なかったことにする</pre>
<pre class="code">BEGIN;
UPDATE books SET shelf = 'C' WHERE shelf = 'B';
SELECT * FROM books;           -- よし
COMMIT;                        -- 確定する</pre>
<ul>
  <li><code>ROLLBACK;</code>　BEGIN からの書き換えを全部取り消す</li>
  <li><code>COMMIT;</code>　BEGIN からの書き換えを確定する</li>
</ul>
<p class="scribble" style="--r:-2deg">COMMIT したら戻らない。当たり前だけど、やるとびっくりする</p>`,
  },
  {
    title: 'よくあるエラー',
    html: `
<h2>よくあるエラー</h2>
<dl class="nb-errors">
  <dt>no such table: ○○</dt><dd>表の名前が違う。.tables で確かめろ</dd>
  <dt>no such column: ○○</dt><dd>列の名前が違う。一回 SELECT * で見ろ。文字を ' で囲み忘れても、これが出る</dd>
  <dt>near "○○": syntax error</dt><dd>○○の手前あたりがおかしい。カンマ、クォート、スペル、書く順番</dd>
  <dt>ambiguous column name: ○○</dt><dd>JOIN したとき、どっちの表の列か書いてない</dd>
  <dt>table ○○ has N columns but M values were supplied</dt><dd>入れる値の数と列の数が合ってない。列の名前を並べて書け</dd>
  <dt>UNIQUE constraint failed</dt><dd>同じ番号の行がもうある</dd>
  <dt>not authorized</dt><dd>それはやめとけ</dd>
</dl>
<h3>エラーは出ないのに、何も出てこない</h3>
<ul>
  <li>文字の中身が違う（全角と半角、空白）。<code>LIKE '%○○%'</code> で探してみる</li>
  <li>日付や時刻の書き方が違う。<code>'2026/05/08'</code> じゃなくて <code>'2026-05-08'</code>。時刻まで入っている列なら <code>LIKE '2026-05-08%'</code> で探す</li>
  <li><code>...&gt;</code> が出たまま → <code>;</code> を忘れてる</li>
</ul>
<p class="scribble" style="--r:2deg">エラーは怒ってるんじゃない。どこが変か教えてくれてる</p>`,
  },
  {
    title: '最後のページ',
    html: `
<div class="nb-last">
  <p class="scribble" style="--r:-1deg">名簿と入金が合わない。</p>
  <p class="scribble" style="--r:1deg">気づいてないのか、気づかないようにしてあるのか。</p>
  <p class="scribble" style="--r:-2deg">書き換えたら前の値が残るように、消したら捨て場に行くようにしておいた。表の名前は地味にしといた。誰にも言ってない。</p>
  <p class="scribble hurried" style="--r:-4deg">念のため全部記録して――</p>
</div>`,
  },
];
