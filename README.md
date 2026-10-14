# SELECT truth FROM lies;

**SQLで謎を解く脱出ゲーム**

205号室の住人が、3週間前から姿を消している。
管理会社の新人システム担当として、マンションの管理システムに残った記録をSQLで調べ、嘘の中から真実を取り出してください。

- ブラウザだけで遊べます（インストール不要）
- SQLを知らなくても大丈夫です。前任者の手書きノートがゲーム内にあります
- 進み具合はブラウザに自動で保存されます

## ローカルで遊ぶ

`file://` で直接開くと読み込みに失敗するので、簡単なWebサーバー越しに開いてください。

```sh
python -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```

## 使っているもの

- [sql.js](https://github.com/sql-js/sql.js)（SQLite を WebAssembly で動かすライブラリ。MIT License。`vendor/sql.js/` に同梱）
- フォント：[BIZ UDGothic](https://fonts.google.com/specimen/BIZ+UDGothic)、[Klee One](https://fonts.google.com/specimen/Klee+One)（SIL Open Font License。Google Fonts から読み込み）
