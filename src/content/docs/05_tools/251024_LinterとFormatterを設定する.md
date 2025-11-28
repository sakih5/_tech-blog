---
title: LinterとFormatterを設定する
---

# LinterとFormatterを設定する

TypeScriptやReact、Python、Markdownを使うプロジェクトでLinterやFormatterが衝突せずに設定できるように試行錯誤した記録を残しておく。

## 前提: 環境

- Windows PCを使用。
- エディタ: VSCode

## Linterとは？

Linterとは、プログラムの**静的解析ツール（static analysis tool）**の一種で、
ソースコードを実行せずにチェックして、
**文法ミス・書き方のムラ・スタイル違反・バグの可能性などを自動的に指摘してくれる**ツール。

| 言語                      | 有名なLinter                | 検出してくれる例                               |
| ----------------------- | ------------------------ | -------------------------------------- |
| Python                  | **ruff**, flake8, pylint | 未使用の変数、インデントミス、命名規則違反など                |
| JavaScript / TypeScript | **ESLint**               | セミコロン抜け、未使用import、`==`ではなく`===`を使うべきなど |
| Markdown                | **markdownlint**         | 見出しの順番ミス、改行やスペースのルール違反など               |
| CSS                     | **stylelint**            | プロパティ順序、単位表記ミス、未使用セレクタなど               |

## Formatterとは？

コードの見た目（フォーマット）を**自動で整えるツール**。
内容（ロジック）は変えずに、インデント・空白・改行・カンマの位置などを統一してくれる。

Ctrl + S を押した時に自動で整形してくれる設定にしておくと良い。

| 言語                              | 代表的なFormatter                   | 特徴                      |
| ------------------------------- | ------------------------------- | ----------------------- |
| Python                          | **black**, ruff (一部機能)          | 強制的に統一。「美しいPython」を自動生成 |
| JavaScript / TypeScript / React | **Prettier**                    | 改行・括弧位置・スペースまで自動整形      |
| HTML / CSS                      | **Prettier**, stylelint (補助)    | インデントと改行を統一             |
| Markdown                        | **Prettier**, markdownlint (補助) | 改行や箇条書きの整形              |

## LinterとFormatterの違いまとめ

| 比較項目 | **Linter**                 | **Formatter**          |
| ---- | -------------------------- | ---------------------- |
| 主な目的 | コードの「間違い」や「非推奨スタイル」を指摘     | コードの「見た目」を自動整形         |
| 動作   | 警告・エラーを出す                  | コードを書き換える              |
| 例    | 「;が抜けてるよ」「未使用変数があるよ」       | 「; を自動で入れる」「インデントを揃える」 |
| ツール例 | Ruff, ESLint, Markdownlint | Black, Prettier        |

## 大まかな方針

TS/React: 整形=Prettier、ルール=ESLint
Python：Ruff（Lint&Format）＋ Pylance（型）
Markdown：markdownlint（保存時のみ）

## どの言語にも効くLinterとFormatterを設定する

- Prettierは多言語（JS/TS/HTML/CSS/JSON/Markdown）の整形に対応
- Code Spell Checkerでスペルミスを検出

| 拡張                                        | 用途                                            |
| ----------------------------------------- | --------------------------------------------- |
| **esbenp.prettier-vscode**                | 多言語での**整形**（JS/TS/HTML/CSS/JSON/Markdown など）。 |
| **streetsidesoftware.code-spell-checker** | コード/コメント/ドキュメントの**綴り**チェック。                   |

![LinterとFormatter1](/_articles/images/imgs_251024_LinterとFormatterを設定する/LinterとFormatter1.png)

![LinterとFormatter2](/_articles/images/imgs_251024_LinterとFormatterを設定する/LinterとFormatter2.png)

## PythonのLinterとFormatterを設定する

- 速さ重視なら Ruff に一本化（lint＋ruff format＋ruff --fix）
- Black 党なら：Black(整形) + Ruff(lint) + isort(整列)
- 型は Pylance を strict 寄りにするのが実務で効く

| 拡張                           | 種別               | 主な役割                                                                |
| ---------------------------- | ---------------- | ------------------------------------------------------------------- |
| **ms-python.python**         | 実行/デバッグ基盤        | Python 実行・デバッグ・テスト・仮想環境検出・ツール連携の土台。                                 |
| **ms-python.vscode-pylance** | 型チェッカー/言語機能      | **Pylance**（Pyright）による高速な**型チェック**・補完・定義ジャンプ。                      |
| **charliermarsh.ruff**       | Linter/Formatter | **Ruff** による高速 lint（flake8/pylint 相当の多くをカバー）＋**整形（ruff format）**も可。 |
| **ms-python.isort**          | Import整列         | `isort` で **import順を自動整列**。※Ruffの `ruff --fix` でも代替可。               |

## JavaScript / TypeScript / ReactのLinterとFormatterを設定する

- よくある組み合わせ：Prettier(整形) + ESLint(品質チェック)。スタイルはPrettier、ルールはESLintに寄せるのが定番

| 拡張                                        | 種別        | 主な役割                                                              |
| ----------------------------------------- | --------- | ----------------------------------------------------------------- |
| **esbenp.prettier-vscode**                | Formatter | JS/TS/JSX/TSX/HTML/CSS/JSON/Markdown を**自動整形**。保存時フォーマットの本命。      |
| **dbaeumer.vscode-eslint**                | Linter    | JS/TS の**静的解析**（未使用・コード規約）。`eslint --fix` で自動修正も。Prettierと役割分担推奨。 |
| **ms-vscode.vscode-typescript-next**      | 言語機能(最新版) | TypeScript の **Nightly/Next** 言語サービス。最新型の型解決・補完を先取り。              |
| **bradlc.vscode-tailwindcss**             | 補助(デザイン)  | Tailwind CSS の**補完/クラス検証**、ホバーでトークン確認、JIT 互換。                     |
| **streetsidesoftware.code-spell-checker** | スペルチェック   | 変数名/コメント/Markdown の**英単語の綴り**を検出。                                 |

## MarkdownファイルのLinterとFormatterを設定する

- 運用例：Markdown は Prettier で整形、markdownlint で規約チェック、cSpell で綴りを見る三位一体。

| 拡張                                        | 種別      | 主な役割                                   |
| ----------------------------------------- | ------- | -------------------------------------- |
| **DavidAnson.vscode-markdownlint**        | Linter  | 見出し階層/箇条書き/改行など **Markdown規約**を自動チェック。 |
| **streetsidesoftware.code-spell-checker** | スペルチェック | Markdown本文やコードブロック内の**英単語の綴り**を検出。     |

## Github Actions等各種設定ファイル（YAML）のLinterとFormatterを設定する

- 例：.github/workflows/*.yml で GitHub Actions のスキーマを読み、キー不足や型違いを即検出。

| 拡張                     | 種別        | 主な役割                                                                      |
| ---------------------- | --------- | ------------------------------------------------------------------------- |
| **redhat.vscode-yaml** | スキーマ検証/補完 | GitHub Actions/Kubernetes などの**Schema 連携**で補完＆**バリデーション**。アンカー/エイリアスも快適に。 |
