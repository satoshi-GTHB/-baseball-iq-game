# AI Developer Guide
## Project FUJICON

## 1. Required Reading Order
1. docs/Constitution.md
2. docs/ProductVision.md
3. docs/Architecture.md
4. 現在のSprint指示
5. 対象コード

上位文書とSprint指示が矛盾する場合、勝手に判断せず報告する。

## 2. Core Interpretation
本プロジェクトは一般的な野球ゲームではない。AI監督が理解度を分析し、次に学ぶ内容を提案することがゲームの中心である。

## 3. Before Coding
変更前に、現在のファイル構成、対象機能の処理フロー、変更予定ファイル、新規作成予定ファイル、既存機能への影響、技術的リスク、テスト方法を報告する。

## 4. Prohibited Actions
- 既存コード未確認の全面書き換え
- 既存問題の削除
- XPだけでレベル決定
- 外部AI APIや有料サービスの無断追加
- npmやフレームワークの無断必須化
- GitHub Pagesで動かなくなる変更
- 著作権素材の利用
- APIキーのフロント埋め込み
- 子どもの個人情報の無断収集
- 問題文や正解の大量推測生成
- 確認なしの大量ファイル削除

## 5. Implementation Principles
小さな差分で進める。ゲームロジック、UI、問題データ、回答履歴、理解度計算、推薦、メッセージ生成を分離する。スマートフォン表示を最優先に確認する。

## 6. AI Coach Rules
AI監督は得意を認め、苦手を否定的に表現せず、次の練習を具体的に示し、挑戦を評価する。叱責、根拠のない昇格、データにない成長断定、野球ルールの推測は行わない。

## 7. Definition of Done
既存ゲームが起動し、守備編とランナー編が動き、JavaScriptエラーがなく、スマートフォン幅で崩れず、再読込後も必要な進捗が残り、確認手順とドキュメントが整合し、GitHub Pagesで動作する。

## 8. Recommended Task Prompt
```text
最初に次の文書を読んでください。
- docs/Constitution.md
- docs/ProductVision.md
- docs/Architecture.md
- docs/AI-Developer-Guide.md

これらは本プロジェクトの上位ルールです。
今回の作業は以下だけです。

【目的】...
【変更範囲】...
【変更禁止】...
【完了条件】...

まずコードを変更せず、現状分析、変更計画、変更ファイル、リスクを報告してください。私の確認後に実装してください。
```

## 9. Conflict Handling
原則と依頼が衝突する場合、衝突箇所、影響、代替案、文書変更案を示し、最終判断をユーザーに委ねる。

## 10. Documentation Maintenance
不変原則はConstitution、製品機能はProductVision、技術責務はArchitecture、AI作業ルールはAI-Developer-Guide、今回作業はSprint文書へ反映する。
