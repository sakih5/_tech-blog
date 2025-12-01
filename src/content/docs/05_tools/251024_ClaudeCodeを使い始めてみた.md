---
title: ClaudeCodeを使い始めてみた
publishedDate: 2025-10-24
---

度重なる要件の変更に、疲弊せず対応できるようになるために、AI の力を借りる方法を模索してみた。

# Claude Code とは？

コーディングエージェントの 1 つ。

- コード補完 ← Github Copilot はこれができる
- 全体のコンテキストを踏まえた修正 ← Claude Code はここが強い

今回は全体のコンテキストを踏まえた修正ができることを重視して Claude Code を選択した。

# インストール手順

1. **WSL に Node.js をインストールする**

`curl`を入れていなければ入れる（`curl`はファイルのやり取りができるソフト）。

```bash
sudo apt update
sudo apt install curl -y
```

nvm（Node version Manager）のインストールスクリプトを取得して、実行する。
インストールが完了したら、一度シェルを再読み込みする。
バージョン確認することで、nvm がインストールされてシェルで nvm コマンドが使えるようになったことを確認する。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
source ~/.bashrc
nvm --version
```

nvm を使って node.js をインストールする
バージョン確認することで、node.js と npm がインストールされてコマンドも使えるようになったことを確認する。

```bash
nvm install node
node -v
npm -v
```

2. **Claude Code をインストールする**
