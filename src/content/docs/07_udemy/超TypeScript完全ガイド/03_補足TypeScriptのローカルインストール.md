---
title: 03_補足TypeScriptのローカルインストール
---

# プロジェクトフォルダにだけTypeScriptを入れる方法

## 🧩 前提

- Node.js と npm がインストールされていること。
- VSCodeなどのエディタでフォルダを開いておく。

---

## ✅ 1. プロジェクトフォルダを作成

```bash
mkdir typescript-lesson
cd typescript-lesson
```

## ✅ 2. npmプロジェクトを初期化

```bash
npm init -y
```

📦 package.json というファイルが作られます。
→ これは「このフォルダで使うパッケージの一覧表」。

## ✅ 3. TypeScriptをローカルインストール

```bash
npm install typescript --save-dev
```

💡 コマンドの意味

| オプション        | 説明                      |
| ------------ | ----------------------- |
| `--save-dev` | 開発用ツールとしてインストール（本番では不要） |

← TODO デプロイ時に

📁 実行後、このような構成になります：

typescript-lesson/
├── node_modules/       ← TypeScriptなどの実体
├── package.json        ← パッケージの一覧
└── package-lock.json   ← 依存関係の詳細

✅ 4. TypeScriptの設定ファイルを作成
npx tsc --init

→ tsconfig.json が生成されます。

これは「TypeScriptの設定ファイル」で、
コンパイルのルールや対象フォルダなどを管理します。
