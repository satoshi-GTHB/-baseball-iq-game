# Architecture
## 野球IQアカデミー 技術設計方針

## 1. Technical Constraints
HTML / CSS / JavaScript、静的サイト、GitHub Pages、iPhone最優先、Android・PC対応、初期AI監督は外部APIなし、localStorage保存。

## 2. High-level Architecture
Question Data → Game Engine → Answer Record → ProgressStorage → LearningAnalytics → CoachRecommendationEngine → CoachMessageGenerator → UI / Next Mission

## 3. Responsibilities
### Question Data
問題文、選択肢、正解、解説、レベル、テーマ、難易度、ランナー状況を保持する。

### Game Engine
問題選択、回答受付、正誤判定、セッション進行、ランナー配置、画面遷移。野球ルール判定はここで確定する。

### ProgressStorage
回答履歴、進捗、version、データ検証、開発用リセット。

### LearningAnalytics
回答数、正解数、正答率、直近5問、連続正解、最終回答日時、理解状態を計算する。理解状態は「バッチリ」「もう少し」「れんしゅう中」。

### CoachRecommendationEngine
未学習、苦手、改善中、現在レベル、問題数、出題偏りを見て次のテーマを決める。

### CoachMessageGenerator
診断結果を子ども向けの言葉へ変換する。初期版はルールベース。

## 4. Runner Display Engine
球場背景、ランナー、本人マーカーを分離する。配置は NONE / FIRST / SECOND / THIRD / FIRST_SECOND / FIRST_THIRD / SECOND_THIRD / LOADED。専用画像を大量に作らずJavaScriptで位置制御する。

## 5. Suggested Repository Structure
```text
/
├─ index.html
├─ README.md
├─ css/
├─ js/
│  ├─ game/
│  ├─ learning/
│  ├─ coach/
│  ├─ storage/
│  ├─ ui/
│  └─ data/
├─ assets/
├─ docs/
│  ├─ Constitution.md
│  ├─ ProductVision.md
│  ├─ Architecture.md
│  └─ AI-Developer-Guide.md
└─ tests/
```

既存構造を確認せず一括移行しない。

## 6. AI Coach MVP Flow
セッション開始→5問または10問→各回答保存→理解度計算→得意・推奨テーマ選定→監督コメント→おすすめ練習開始。

## 7. Level Unlocking
各レベルに必要な学習テーマの理解状態で解放する。XPのみで解放しない。

## 8. Storage Policy
保存データはversion、player、answers、themeProgress、unlockedLevels、settingsを持つ。読み込み時に検証し、将来の移行に備える。

## 9. Future AI API Integration
生成AI導入後も野球判定は既存エンジンが行う。生成AIは検証済み診断の言い換えに限定し、GitHub PagesからAPIを直接呼ばない。

## 10. Architecture Rules
UIからlocalStorageを直接操作しない。正誤判定とコメント生成を混ぜない。問題データにDOM操作を含めない。1回のSprintで変更範囲を限定する。
