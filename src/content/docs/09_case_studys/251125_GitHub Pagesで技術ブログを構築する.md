---
title: GitHub Pagesで技術ブログを構築する
---

# GitHub Pagesで技術ブログを構築する

## 記事概要

| 項目 | 内容 |
| ---- | ---- |
| 難易度 | ★★☆☆☆（初心者向け） |
| 所要時間 | 約30分 |
| 検証環境 | Windows 11 + WSL2 (Ubuntu 24.04) |
| 目的 | AstroとGitHub Pagesで技術記事サイトを無料公開する方法 |

## 本記事を作成した背景

これまで書き溜めてきた技術記事を整理して公開したいと思い、無料で使えるホスティングサービスを探していました。GitHub Pagesなら、Gitリポジトリに記事をpushするだけで自動的にサイトがデプロイされるため、執筆に集中できると考えました。Astro + Starlightを使うことで、Markdownファイルから高速で美しいドキュメントサイトを簡単に生成できます。

## 本記事で取り組んだこと

- AstroとStarlightを使った技術ブログの構築
- GitHub Actionsを使った自動デプロイの設定
- サイドバーナビゲーション構造の設計とサイトのカスタマイズ

## 手順

### 前提

- **環境**: Windows 11 + WSL2 (Ubuntu 24.04)
- **前提知識**: GitとGitHub、Node.jsの基本的な使い方がわかる
- **前提状態**: Node.js 20以上がインストール済み、GitHubアカウント作成済み

### 1. Astroプロジェクトの作成

#### 目的

Astro + Starlightを使った新しいプロジェクトを作成します。

#### 手順詳細

Astroの公式CLIを使ってStarlightテンプレートでプロジェクトを作成します。

```bash
npm create astro@latest -- --template starlight
```

プロジェクト名を入力すると、必要なファイルが自動生成されます。

```bash
cd your-project-name
npm install
```

#### 理解ポイント

- **Astro**: 高速な静的サイトを生成するモダンなWebフレームワーク
- **Starlight**: Astro用の公式ドキュメントテーマで、美しいUIと豊富な機能を提供

### 2. Astroの設定ファイル作成

#### 目的

サイトの構造、テーマ、ナビゲーションを定義するための設定ファイルを作成します。

#### 手順詳細

`astro.config.mjs`を以下のように設定します。

```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://your-username.github.io',
  base: '/your-repo-name',
  integrations: [
    starlight({
      title: '技術記事アーカイブ',
      description: '個人開発・技術学習の記録を集約した技術ブログ',

      // 日本語設定
      defaultLocale: 'root',
      locales: {
        root: {
          label: '日本語',
          lang: 'ja',
        },
      },

      // ソーシャルリンク
      social: {
        github: 'https://github.com/your-username/your-repo',
      },

      // サイドバーナビゲーション
      sidebar: [
        {
          label: 'ホーム',
          link: '/',
        },
        {
          label: 'カテゴリ',
          collapsed: false,
          items: [
            {
              label: 'フロントエンド',
              collapsed: true,
              autogenerate: { directory: '01_frontend' },
            },
            {
              label: 'バックエンド',
              collapsed: true,
              autogenerate: { directory: '02_backend' },
            },
            // 他のカテゴリを追加...
          ],
        },
      ],

      // カスタムCSS
      customCss: [
        './src/styles/custom.css',
      ],

      // 編集リンク
      editLink: {
        baseUrl: 'https://github.com/your-username/your-repo/edit/main/',
      },

      // 最終更新日を表示
      lastUpdated: true,

      // 目次の深さ
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
    }),
  ],
});
```

#### 理解ポイント

- **site**: サイトのベースURL（GitHub PagesのURL）
- **base**: サブパス（リポジトリ名）
- **sidebar**: サイドバーのナビゲーション構造を定義
- **autogenerate**: ディレクトリ内のMarkdownファイルから自動的にナビゲーションを生成
- **customCss**: カスタムスタイルシートの指定

### 3. コンテンツの作成

#### 目的

Markdown記事を配置するディレクトリ構造を作成します。

#### 手順詳細

`src/content/docs/`ディレクトリ内に記事を配置します。

```
src/content/docs/
├── index.md                    # トップページ
├── 01_frontend/
│   └── article1.md
├── 02_backend/
│   └── article2.md
└── 09_case_studys/
    └── article3.md
```

各Markdownファイルは以下のフロントマターを含めます。

```markdown
---
title: 記事のタイトル
---

# 記事のタイトル

記事の内容...
```

#### 理解ポイント

Starlightは`src/content/docs/`ディレクトリ内のMarkdownファイルを自動的に検出し、ルーティングを生成します。

### 4. ローカルでのプレビュー確認

#### 目的

GitHub Pagesにデプロイする前に、ローカル環境でサイトの見た目を確認します。

#### 手順詳細

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで`http://localhost:4321`にアクセスすると、サイトのプレビューが表示されます。ファイルを編集すると自動的にリロードされます。

#### 理解ポイント

`npm run dev`コマンドは、開発用のホットリロードサーバーを起動します。Markdownファイルや設定ファイルを編集すると、即座にブラウザに反映されるため、執筆・調整がスムーズに行えます。

### 5. GitHub Actionsの設定

#### 目的

mainブランチにpushしたときに、自動的にGitHub Pagesへデプロイされるようにします。

#### 手順詳細

`.github/workflows/deploy.yml`を作成します。

```yaml
name: Deploy Astro Starlight to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Astro site
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 理解ポイント

- **on.push.branches**: mainブランチへのpush時にワークフローを実行
- **workflow_dispatch**: GitHub UIから手動でワークフローを実行可能
- **permissions**: GitHub Pagesへのデプロイに必要な権限を付与
- **cache: 'npm'**: npm依存関係をキャッシュして、ビルド時間を短縮
- **npm ci**: `package-lock.json`を使った高速で確実なインストール
- **./dist**: Astroのビルド結果が出力されるディレクトリ

### 6. GitHubリポジトリの設定

#### 目的

GitHub PagesでサイトをホスティングするためのGitHub側の設定を行います。

#### 手順詳細

1. GitHubのリポジトリページにアクセス
2. **Settings** > **Pages** を開く
3. **Source**で「GitHub Actions」を選択

#### 理解ポイント

従来の`gh-pages`ブランチを使う方法から、GitHub Actions経由でデプロイする方法に変更されました。これにより、ビルドプロセスがより透明になり、デバッグも容易になります。

### 7. デプロイ実行と確認

#### 目的

設定ファイルをリポジトリにpushして、自動デプロイが正常に動作することを確認します。

#### 手順詳細

設定ファイルをGitにコミット・プッシュします。

```bash
git add .
git commit -m "Add Astro configuration and GitHub Actions workflow"
git push origin main
```

GitHubのリポジトリページで、**Actions**タブを開いてワークフローの実行状況を確認します。デプロイが成功したら、サイトにアクセスできます。

#### 理解ポイント

初回デプロイ時は、GitHub Pagesの設定が有効になるまで数分かかる場合があります。Actionsタブで緑のチェックマークが表示されれば、デプロイは成功しています。

## 学び・次に活かせる知見

- **autogenerate機能が便利**: サイドバーの`autogenerate`機能を使うことで、ディレクトリ内のファイルから自動的にナビゲーションが生成されるため、記事追加時の管理が楽になる
- **Astroのビルド速度が非常に速い**: 静的サイトジェネレーターとして、ビルド時間が短く開発体験が良い
- **Starlightのデフォルトデザインが優秀**: カスタマイズなしでも美しく、モバイル対応もバッチリ
- **GitHub Actionsのキャッシュ機能**: npm依存関係をキャッシュすることで、ビルド時間を大幅に短縮できた
- **自動デプロイの快適さ**: mainブランチにpushするだけでサイトが更新されるため、執筆に集中できる環境が構築できた

## 参考文献

1. [Astro公式ドキュメント](https://docs.astro.build/)
2. [Starlight公式ドキュメント](https://starlight.astro.build/)
3. [GitHub Pages公式ドキュメント](https://docs.github.com/ja/pages)
4. [GitHub Actions公式ドキュメント](https://docs.github.com/ja/actions)

## 更新履歴

- 2025-11-25：初版公開（MkDocs版）
- 2025-11-28：Astro + Starlightへの移行に伴い内容を全面改訂
