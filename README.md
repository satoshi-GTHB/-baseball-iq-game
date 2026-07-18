# 野球IQアカデミー Ver3.0

Ver2系の継ぎ足しをやめ、スマホ表示を最優先に新規設計したゲーム基盤です。

## Ver3.0の特徴

- 古いCSSを引き継がない新規構成
- キャッシュ対策として全ファイルに `?v=3.0.0`
- 問題文・グラウンド・選択肢を完全に分離
- グラウンド画像は `object-fit: contain`
- ホームベースから外野まで必ず全体表示
- 320px幅から対応
- 縦画面・横画面対応
- iPhone Safariのセーフエリア対応
- 横スクロールなし
- 問題は `questions.js` へ追加可能

## GitHubへの更新

ZIPを展開し、中身をすべてローカルリポジトリへ上書きしてください。

- index.html
- style.css
- questions.js
- script.js
- README.md
- assets フォルダ
- .nojekyll

Summary例：

`Ver3.0 スマホ最適化版を新規実装`
