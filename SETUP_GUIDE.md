# GitHub Pages セットアップガイド (Astro Starlight)

このリポジトリをGitHub Pagesで公開するための手順です。

## 構成

- **Astro**: 高速な静的サイトジェネレーター
- **Starlight**: Astro公式のドキュメントテーマ
- **GitHub Actions**: 自動デプロイ

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. リポジトリの準備

このリポジトリをGitHubにプッシュします。

```bash
git add .
git commit -m "Setup Astro Starlight for GitHub Pages"
git push origin main
```

### 3. GitHub Pages の有効化

1. GitHubリポジトリの「Settings」タブを開く
2. 左サイドバーから「Pages」を選択
3. 「Source」で「GitHub Actions」を選択

**注意**: Astroでは`gh-pages`ブランチではなく、GitHub Actionsから直接デプロイします。

### 4. GitHub Actions の権限設定

1. GitHubリポジトリの「Settings」タブを開く
2. 左サイドバーから「Actions」→「General」を選択
3. 「Workflow permissions」セクションで「Read and write permissions」を選択
4. 「Save」をクリック

### 5. デプロイ

mainブランチにプッシュすると、GitHub Actionsが自動的に実行され、サイトがデプロイされます。

手動でデプロイする場合：

1. GitHubリポジトリの「Actions」タブを開く
2. 左サイドバーから「Deploy Astro Starlight to GitHub Pages」を選択
3. 「Run workflow」をクリック

### 6. サイトの確認

デプロイ完了後、以下のURLでサイトが公開されます：

```
https://<username>.github.io/<repository-name>/
```

## ローカルでのプレビュー

ローカル環境でサイトを確認する場合：

```bash
# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:4321/_articles/` を開くと、サイトをプレビューできます。

### ビルド確認

本番ビルドを確認する場合：

```bash
# ビルド
npm run build

# プレビュー
npm run preview
```

## ディレクトリ構成

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions ワークフロー
├── src/
│   ├── content/
│   │   ├── docs/               # 記事ディレクトリ（organized_articlesからコピー）
│   │   │   ├── index.md        # トップページ
│   │   │   ├── 01_frontend/    # フロントエンド記事
│   │   │   ├── 02_backend/     # バックエンド記事
│   │   │   ├── 03_infrastructure/ # インフラ記事
│   │   │   └── ...
│   │   └── config.ts           # コンテンツスキーマ
│   └── styles/
│       └── custom.css          # カスタムスタイル
├── public/
│   ├── favicon.svg             # ファビコン
│   └── images/                 # 画像ファイル
├── organized_articles/          # 元の記事ディレクトリ
├── scripts/                     # ビルドスクリプト
├── astro.config.mjs            # Astro設定ファイル
├── package.json                # Node.js依存パッケージ
└── tsconfig.json               # TypeScript設定
```

## 機能

- **高速な検索機能**: Pagefindによる全文検索
- **カテゴリナビゲーション**: 左サイドバーでカテゴリ別に記事を閲覧
- **目次自動生成**: 各記事の右側に目次を表示
- **ライト/ダークモード切替**: テーマカラーの切り替え
- **レスポンシブデザイン**: スマホ・タブレット対応
- **シンタックスハイライト**: コードブロックの美しい表示
- **最終更新日表示**: Gitコミット履歴から自動取得

## カスタマイズ

### サイト情報の変更

`astro.config.mjs` ファイルで以下の設定を変更できます：

```javascript
starlight({
  title: '技術記事アーカイブ',
  description: '個人開発・技術学習の記録を集約した技術ブログ',
  social: {
    github: 'https://github.com/sakih/_articles',
  },
  // ...
})
```

### テーマカラーの変更

`src/styles/custom.css` でカスタムカラーを定義：

```css
:root {
  --sl-color-accent: #0969da;
  --sl-color-accent-high: #033d8b;
}
```

### ナビゲーションの変更

新しい記事を追加した場合は、`astro.config.mjs` の `sidebar` セクションに追加してください。
また、`autogenerate`を使用している場合は、自動的に追加されます。

## 新しい記事の追加方法

1. `organized_articles/` の適切なカテゴリに `.md` ファイルを作成
2. ファイルの先頭にfrontmatterを追加：

```markdown
---
title: 記事のタイトル
---

記事の内容...
```

3. `src/content/docs/` にコピー（または自動ビルド）

```bash
# 全ファイルをコピー
cp -r organized_articles/* src/content/docs/
```

## トラブルシューティング

### GitHub Actions が失敗する

- リポジトリの「Settings」→「Actions」→「General」で、ワークフローの権限が「Read and write permissions」になっているか確認
- GitHub Pagesの設定で「Source」が「GitHub Actions」になっているか確認

### サイトが表示されない

- GitHub Pagesの設定を確認
- GitHub Actionsのログでエラーが出ていないか確認
- `astro.config.mjs` の `base` 設定がリポジトリ名と一致しているか確認

### ローカルでビルドエラーが出る

```bash
# キャッシュをクリア
rm -rf .astro node_modules
npm install
npm run dev
```

### 画像が表示されない

- 画像ファイルが `public/images/` にあるか確認
- 記事内の画像パスが正しいか確認（例: `/_articles/images/imgs_xxx/image.png`）

## パフォーマンス

Astro Starlightは非常に高速です：

- **ビルド時間**: 約10-20秒（60記事）
- **初回読み込み**: <1秒
- **ページ遷移**: ほぼ瞬時
- **Lighthouse スコア**: 100点満点を狙える

## 参考リンク

- [Astro公式ドキュメント](https://docs.astro.build/)
- [Starlight公式ドキュメント](https://starlight.astro.build/)
- [GitHub Pages ドキュメント](https://docs.github.com/pages)
