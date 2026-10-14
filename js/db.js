// ゲーム内のSQLiteデータベース（sql.js）を扱う。

// 物語を壊す操作は、SQLiteの権限エラーと同じ文言で止める
const BLOCKED = /^\s*(DROP|ATTACH|DETACH|VACUUM|REINDEX|ALTER)\b/i;
const PRAGMA_WRITE = /^\s*PRAGMA\b[^;]*=/i;

export function initSql() {
  return window.initSqlJs({ locateFile: (file) => `vendor/sql.js/${file}` });
}

export class GameDb {
  constructor(SQL, db) {
    this.SQL = SQL;
    this.db = db;
  }

  static async fromSeed(SQL, url = 'db/seed.sql') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} を読み込めませんでした（${res.status}）`);
    const db = new SQL.Database();
    db.exec(await res.text());
    return new GameDb(SQL, db);
  }

  static fromBytes(SQL, bytes) {
    return new GameDb(SQL, new SQL.Database(bytes));
  }

  // sql.js の export() はDBを開き直すので、トランザクション中に呼ぶと中身が消える
  inTransaction() {
    try {
      this.db.exec('BEGIN');
      this.db.exec('ROLLBACK');
      return false;
    } catch {
      return true;
    }
  }

  exportBytes() {
    return this.db.export();
  }

  replace(bytes) {
    this.db.close();
    this.db = new this.SQL.Database(bytes);
  }

  // ゲーム側の内部処理用（プレイヤーの入力には使わない）
  query(sql, params = []) {
    const stmt = this.db.prepare(sql, params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  exec(sql, params = []) {
    this.db.run(sql, params);
  }

  // プレイヤーの入力を実行する。
  // outputs: 画面に出すもの / statements: 実行した文の種類と変更行数（判定用）
  run(input) {
    const text = input.trim();
    if (text.startsWith('.')) return { outputs: this.dot(text), statements: [] };

    const outputs = [];
    const statements = [];
    try {
      for (const stmt of this.db.iterateStatements(input)) {
        const sql = stmt.getSQL();
        if (BLOCKED.test(sql) || PRAGMA_WRITE.test(sql)) throw new Error('not authorized');
        const columns = stmt.getColumnNames();
        const values = [];
        while (stmt.step()) values.push(stmt.get());
        const kind = (sql.match(/^\s*(\w+)/)?.[1] ?? '').toUpperCase();
        const writes = ['INSERT', 'UPDATE', 'DELETE', 'REPLACE'].includes(kind);
        statements.push({ kind, sql, changes: writes ? this.db.getRowsModified() : 0 });
        if (columns.length) outputs.push({ type: 'table', columns, values });
      }
    } catch (e) {
      outputs.push({ type: 'error', text: `Error: ${e.message}` });
    }
    return { outputs, statements };
  }

  dot(text) {
    const [cmd, ...args] = text.split(/\s+/);
    switch (cmd) {
      case '.tables': {
        const names = this.query(
          `SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name`,
        ).map((r) => r.name);
        const width = Math.max(...names.map((n) => n.length)) + 2;
        const lines = [];
        for (let i = 0; i < names.length; i += 3) {
          lines.push(names.slice(i, i + 3).map((n) => n.padEnd(width)).join('').trimEnd());
        }
        return [{ type: 'text', text: lines.join('\n') }];
      }
      case '.schema': {
        const rows = args.length
          ? this.query(`SELECT sql FROM sqlite_master WHERE tbl_name = ? AND sql IS NOT NULL`, [args[0]])
          : this.query(`SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'`);
        return [{ type: 'text', text: rows.map((r) => `${r.sql};`).join('\n') }];
      }
      case '.help':
        return [{
          type: 'text',
          text: [
            '.clear             画面を消す',
            '.help              この一覧を表示する',
            '.schema ?TABLE?    テーブルの定義を表示する',
            '.tables            テーブルの一覧を表示する',
          ].join('\n'),
        }];
      default:
        return [{ type: 'error', text: `Error: unknown command or invalid arguments:  "${cmd.slice(1)}". Enter ".help" for help` }];
    }
  }
}
