# カスタマイズガイド

記事の見た目を調整する際の参考ガイドです。

## ファイル構成

### 主要ファイル

- **`src/styles/custom.css`**: 記事のスタイル調整（メイン）
- **`astro.config.mjs`**: サイト全体の設定
- **`src/content/docs/`**: 記事ファイル（Markdown）

## よく調整する項目

### 1. 見出しのスタイル

**ファイル**: `src/styles/custom.css`

```css
/* 記事タイトル（h1）のサイズ */
.sl-markdown-content h1 {
  font-size: 1.5rem !important;  /* サイズ変更 */
  font-weight: 700;
  margin-bottom: 1.5rem;
}

/* 見出し2〜6のサイズ */
.sl-markdown-content h2,
.sl-markdown-content h3,
.sl-markdown-content h4 {
  font-size: 1rem !important;
}

/* #記号の色を変更 */
.sl-markdown-content h2::before {
  color: var(--sl-color-gray-4);  /* 色変更 */
}
```

### 2. 本文のフォントサイズ・行間

**ファイル**: `src/styles/custom.css`

```css
/* 本文 */
.sl-markdown-content p {
  font-size: 1rem;        /* フォントサイズ */
  line-height: 1.7;       /* 行間 */
  margin-bottom: 1rem;    /* 段落間の余白 */
}
```

### 3. コードブロックのスタイル

**ファイル**: `src/styles/custom.css`

```css
/* インラインコード */
code {
  background-color: var(--sl-color-gray-2);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

/* コードブロック */
pre {
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
}
```

### 4. リンクの色・スタイル

**ファイル**: `src/styles/custom.css`

```css
a {
  color: var(--sl-color-accent);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  text-decoration: underline;
  color: var(--sl-color-accent-high);
}
```

### 5. テーブルのスタイル

**ファイル**: `src/styles/custom.css`

```css
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.5rem 0;
}

table th,
table td {
  padding: 0.75rem 1rem;
  border: 1px solid var(--sl-color-gray-3);
}

table th {
  background-color: var(--sl-color-gray-2);
  font-weight: 600;
}
```

### 6. 配色（カラーテーマ）

**ファイル**: `src/styles/custom.css`

```css
/* ライトモード */
:root {
  --sl-color-accent: #0969da;          /* メインカラー */
  --sl-color-accent-low: #e8f4fd;      /* 薄いアクセント */
  --sl-color-accent-high: #033d8b;     /* 濃いアクセント */

  --sl-color-gray-1: #f6f8fa;          /* 背景色（最も薄い） */
  --sl-color-gray-2: #eaeef2;          /* 背景色（薄い） */
  --sl-color-gray-3: #d0d7de;          /* ボーダー色 */
  --sl-color-gray-4: #8c959f;          /* テキスト色（薄い） */
  --sl-color-gray-5: #6e7781;          /* テキスト色 */
  --sl-color-gray-6: #57606a;          /* テキスト色（濃い） */
}

/* ダークモード */
:root[data-theme='dark'] {
  --sl-color-accent: #4493f8;
  /* ... */
}
```

### 7. サイドバーの幅

**ファイル**: `src/styles/custom.css`

```css
/* サイドバーの幅を変更 */
@media (min-width: 50rem) {
  .sidebar {
    width: 20rem;  /* デフォルトは18rem */
  }
}
```

### 8. コンテンツエリアの最大幅

**ファイル**: `src/styles/custom.css`

```css
.sl-markdown-content {
  max-width: 80ch;  /* デフォルトは65ch */
}
```

### 9. 目次の表示範囲

**ファイル**: `astro.config.mjs`

```javascript
tableOfContents: {
  minHeadingLevel: 2,  /* h2から表示 */
  maxHeadingLevel: 3,  /* h3まで表示 */
}
```

### 10. ページネーションのON/OFF

**ファイル**: `astro.config.mjs`

```javascript
pagination: true,  /* 前後のページリンク */
```

## CSS変数一覧

### 主要な色変数

| 変数名 | 説明 | デフォルト値（ライト） |
| --- | --- | --- |
| `--sl-color-accent` | アクセントカラー | `#0969da` |
| `--sl-color-accent-high` | 濃いアクセント | `#033d8b` |
| `--sl-color-gray-1` | 最も薄いグレー | `#f6f8fa` |
| `--sl-color-gray-6` | 最も濃いグレー | `#57606a` |
| `--sl-color-white` | 白/黒（テーマ依存） | `#ffffff` |
| `--sl-color-black` | 黒/白（テーマ依存） | `#24292f` |

### スペーシング変数

| 変数名 | 説明 |
| --- | --- |
| `--sl-content-width` | コンテンツの最大幅 |
| `--sl-sidebar-width` | サイドバーの幅 |

## デバッグのコツ

### 1. ブラウザの開発者ツールを使う

1. **F12**または**右クリック→検証**で開発者ツールを開く
2. **Elements**タブで要素を選択
3. **Styles**パネルで適用されているスタイルを確認
4. その場で値を変更して確認できる

### 2. クラス名を見つける

Starlightの主なクラス名：
- `.sl-markdown-content`: 記事本文
- `.sl-container`: コンテナ
- `.sidebar`: サイドバー
- `.right-sidebar`: 目次サイドバー

### 3. CSSの優先順位

- `!important`を使うと最優先される
- より具体的なセレクタが優先される

```css
/* 優先度: 低 */
h1 { font-size: 2rem; }

/* 優先度: 高 */
.sl-markdown-content h1 { font-size: 1.5rem; }

/* 優先度: 最高 */
.sl-markdown-content h1 { font-size: 1.5rem !important; }
```

## よくある調整例

### 記事の幅を広くする

```css
.sl-markdown-content {
  max-width: 90ch;  /* デフォルト: 65ch */
}
```

### コードブロックのフォントサイズを小さくする

```css
pre code {
  font-size: 0.875rem;
}
```

### リストの間隔を広げる

```css
.sl-markdown-content ul,
.sl-markdown-content ol {
  line-height: 2;
}
```

### 画像の角を丸くする

```css
.sl-markdown-content img {
  border-radius: 8px;
}
```

## 変更後の確認

1. ファイルを保存
2. ブラウザをリロード（開発サーバーは自動で反映される場合もあり）
3. 変更が反映されない場合は、ブラウザのキャッシュをクリア（Ctrl+Shift+R）

## トラブルシューティング

### スタイルが反映されない

- `!important`を追加してみる
- より具体的なセレクタを使う
- ブラウザのキャッシュをクリア
- 開発サーバーを再起動

### ダークモードで色がおかしい

- `:root[data-theme='dark']`内の変数も変更する

### フォントが変わらない

- フォントファミリーの指定順序を確認
- システムにフォントがインストールされているか確認
