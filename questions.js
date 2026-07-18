window.GAME_QUESTIONS = [
  {
    category: "守備",
    situation: "ノーアウト・ランナー1塁",
    runners: ["first"],
    question: "内野ゴロを捕った。どこへ投げる？",
    choices: [
      {
        text: "1塁",
        grade: "triangle",
        points: 5,
        explanation: "1アウトは取れます。ただし、先のランナーが2塁に残るため、最善ではありません。"
      },
      {
        text: "2塁",
        grade: "circle",
        points: 10,
        explanation: "先のランナーをアウトにでき、さらに1塁も狙える最善の判断です。"
      },
      {
        text: "ホーム",
        grade: "cross",
        points: 0,
        explanation: "ホームへ向かっているランナーはいないため、アウトを取れません。"
      }
    ],
    hint: "先のランナーをアウトにできる塁を考えよう。"
  },
  {
    category: "守備",
    situation: "ランナーなし",
    runners: [],
    question: "ゴロを捕った。どこへ投げる？",
    choices: [
      {
        text: "1塁",
        grade: "circle",
        points: 10,
        explanation: "打者走者が最初に向かう1塁でアウトを取るのが最善です。"
      },
      {
        text: "2塁",
        grade: "cross",
        points: 0,
        explanation: "2塁にはアウトにできるランナーがいません。"
      },
      {
        text: "ホーム",
        grade: "cross",
        points: 0,
        explanation: "ホームにはアウトにできるランナーがいません。"
      }
    ],
    hint: "打った人が最初に向かう塁はどこかな？"
  },
  {
    category: "守備",
    situation: "2アウト・ランナー3塁",
    runners: ["third"],
    question: "内野ゴロを捕った。どこへ投げる？",
    choices: [
      {
        text: "1塁",
        grade: "circle",
        points: 10,
        explanation: "2アウトなので、近くて確実な1塁で打者走者をアウトにすればチェンジです。"
      },
      {
        text: "ホーム",
        grade: "triangle",
        points: 5,
        explanation: "ホームでアウトを取れる可能性はありますが、送球距離が長く、1塁より確実性が下がります。"
      },
      {
        text: "3塁",
        grade: "cross",
        points: 0,
        explanation: "3塁ランナーはすでに3塁にいるため、3塁へ投げてもアウトにはできません。"
      }
    ],
    hint: "あと1アウトでチェンジ。いちばん近くて確実な塁は？"
  },
  {
    category: "守備",
    situation: "フライ・ランナーなし",
    runners: [],
    question: "自分の近くにフライが上がった。まず何をする？",
    choices: [
      {
        text: "声を出す",
        grade: "circle",
        points: 10,
        explanation: "大きな声で自分が捕ることを伝えるのが最善です。仲間との衝突も防げます。"
      },
      {
        text: "黙って捕る",
        grade: "triangle",
        points: 5,
        explanation: "捕れればアウトにはできますが、仲間とぶつかる危険があります。"
      },
      {
        text: "ベンチへ戻る",
        grade: "cross",
        points: 0,
        explanation: "プレー中なので、打球を追わなければいけません。"
      }
    ],
    hint: "仲間とぶつからないために必要なことは？"
  },
  {
    category: "守備",
    situation: "送球後・ランナー1塁",
    runners: ["first"],
    question: "ボールを投げたあと、次に何をする？",
    choices: [
      {
        text: "カバーへ動く",
        grade: "circle",
        points: 10,
        explanation: "送球後もプレーを見て、悪送球などに備えてカバーへ動くのが最善です。"
      },
      {
        text: "その場で見る",
        grade: "triangle",
        points: 5,
        explanation: "プレーを見ることは大切ですが、必要な場所へ動く方がより良い判断です。"
      },
      {
        text: "ベンチへ戻る",
        grade: "cross",
        points: 0,
        explanation: "まだプレーは続いているため、ベンチへ戻ってはいけません。"
      }
    ],
    hint: "野球は投げたら終わりではありません。"
  }
];

window.LEVELS = [
  { level: 1, name: "体験生", minXp: 0 },
  { level: 2, name: "入団", minXp: 50 },
  { level: 3, name: "準レギュラー", minXp: 150 },
  { level: 4, name: "レギュラー", minXp: 350 },
  { level: 5, name: "オール上尾", minXp: 700 },
  { level: 6, name: "コーチ", minXp: 1200 },
  { level: 7, name: "監督", minXp: 2000 },
  { level: 8, name: "NPB", minXp: 3200 },
  { level: 9, name: "メジャー", minXp: 5000 },
  { level: 10, name: "殿堂入り", minXp: 8000 }
];
