---
title: Poetryでvenv+pipを代替する
publishedDate: 2025-10-07
---

# Poetry とは

Python の**依存管理 / プロジェクト管理ツール**で、

1. **依存関係を保った上でライブラリのインストール・アンインストール**
2. **仮想環境の分離**
3. **パッケージ化・公開**

までを統一的に扱えるように設計されている。

以下、各項目の詳細を記載する。

1. **依存管理**

Poetry は、従来の`pip`の機能を包含しつつ、**依存解決**や**ロック（lock ファイル化）**といった仕組みを提供し、**ライブラリ間のバージョン依存性の整合性を保つ**ことを目指している。

- **依存管理**とは、プロジェクトが使うライブラリやそのバージョン、およびそれらの依存関係（**そのライブラリがさらに依存しているものも含む**）を管理すること
- Poetry は、以下の流れを自動でサポートする:

  1. **宣言**（`pyproject.toml` に使いたいパッケージを記述）
  2. **解決**（どのバージョンを使うかを決定）
  3. **ロック**（`poetry.lock` に具体的なバージョンを固定）

- `pip` はライブラリをインストール・アンインストールできるが、**依存ライブラリのバージョン整合性を十分に意識した操作**は基本的に自動化していない。

2. **仮想環境分離**

- Poetry は、プロジェクトごとの仮想環境を自動生成・使用する機能を持っている（ただし、**設定により無効化も可能** ← Docker 上での使用時は無効化が原則）
- プロジェクト内に `.venv` ディレクトリを作るよう設定することも可能: `poetry config virtualenvs.in-project true`
- ただし注意：**Poetry 自体は仮想環境ツールそのものではなく**、既存の仮想環境や環境隔離の枠組みを管理・活用するツール

3. **プロジェクト管理・公開機能**

Poetry では、`poetry.lock` を使うことで、`requirements.txt` に現れない間接依存なども含めた全体の依存構成を固定できる。
それにより、別の環境（別の PC、CI、本番サーバなど）でも “まったく同じ依存構成” を再現しやすくなる。

- `poetry build`：ソース配布（sdist）や wheel 形式にビルド
- `poetry publish`：ビルド済のパッケージを PyPI などに公開

## 補足 Poetry における依存管理の仕組み

- 依存関係があるライブラリについて、Poetry はロックファイル（`poetry.lock`）で利用する具体的なバージョンを固定する
- `poetry show --tree` コマンドで依存関係ツリーを可視化でき、どのパッケージがどのパッケージに依存しているかを確認できる。これにより、競合がありそうな箇所を見つけやすくなっている
- ただし、依存解決プロセスは複雑で、依存関係が多いプロジェクトでは時間がかかることがある（特に依存のバージョン制約がゆるい場合）

---

# 前提

- Windows PC を使う
- WSL2 を使っており、Ubuntu 等の Linux 環境上で作業
- Docker Engine は WSL 内または Linux 側にインストール済み
- FastAPI で API サーバを構築したい
- Poetry（Python のモダンな依存管理／パッケージ管理ツール）を使用する

---

# 大まかな流れ

コンテナ化を見据えて、Docker + poetry にする
（コンテナ化を見据えなければ、WSL 上の pyenv + poetry で環境構築をすることもある）

0. （初回のみ）WSL 上に Poetry をインストールする
1. プロジェクトディレクトリ構成を作成
2. `pyproject.toml`を作成 / Poetry 初期化
3. `Dockerfile`、`docker-compose.yml`を書く
4. FastAPI アプリ本体 (`app/main.py`など) を書く
5. Docker イメージをビルド
6. コンテナを起動
7. FastAPI にアクセス、開発・停止など

---

# 0. （初回のみ）WSL 上に Poetry をインストールする

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

- `curl`は Web からデータを取得するコマンド
- `https://install.python-poetry.org`は Poetry の公式インストールスクリプト。このスクリプト（**Python で書かれている**）を Python で実行することで、**Poetry がインストールされる**
- オプションの意味:

  | オプション | 意味                                                                       |
  | ---------- | -------------------------------------------------------------------------- |
  | `-s`       | silent（進捗バーなどを非表示にする）                                       |
  | `-S`       | error が起きたときだけエラーを表示する（`-s`と併用して静かに失敗を見せる） |
  | `-L`       | リダイレクトをたどる（URL が転送されても OK にする）                       |

- 出力例:

  ```bash
  Installing Poetry (2.2.1): Done

  Poetry (2.2.1) is installed now. Great!

  To get started you need Poetry's bin directory (/home/sakih/.local/bin) in your `PATH`
  environment variable.

  Add `export PATH="/home/sakih/.local/bin:$PATH"` to your shell configuration file.

  Alternatively, you can call Poetry explicitly with `/home/sakih/.local/bin/poetry`.

  You can test that everything is set up by executing:

  `poetry --version`
  ```

- 出力例を読むとわかるように、`poetry`コマンドが使えるように PATH を通す

  ```bash
  export PATH="$HOME/.local/bin:$PATH"
  source ~/.bashrc # 再起動せずに環境変数の変更を反映
  ```

- `poetry`コマンドが使えることを確認

  ```bash
  poetry --version
  ```

# 1. ディレクトリ構成

- `poetry.lock`は、`poetry add`コマンドを実行した際に**自動生成**するファイルなので作成しないでおくこと（**空ファイルを作成しておくとエラーになった** `The lock file does not have a metadata entry.`）

```txt
backend-study_postgresql-test-with-poetry/
├── app/ # FastAPIのアプリコードはここに集約する
│   └── main.py
├── pyproject.toml
├── poetry.lock
├── Dockerfile
└── docker-compose.yml
```

# 2. Poetry プロジェクトの初期化・依存追加

プロジェクトディレクトリに移動して Poetry プロジェクトを初期化する

```bash
cd backend-study_postgresql-test-with-poetry
poetry init
```

依存管理したいライブラリ名を追加する。追加の仕方は 3 通りある。今回は「**2.`requirements.txt`に記載されたライブラリをそのまま`cat`コマンドで読み込み、追加する**」のやり方を選択

1. **1 つずつコマンドをたたいて追加していく**

```bash
poetry add fastapi@0.111.0
poetry add uvicorn[standard]@0.30.1
...
```

まとめて追加もできる

```bash
poetry add fastapi@0.111.0 uvicorn[standard]@0.30.1 pydantic@2.6.4 \
  SQLAlchemy@2.0.35 psycopg[binary]@3.2.1 python-dotenv@1.0.1
```

2. **`requirements.txt`に記載されたライブラリをそのまま`cat`コマンドで読み込み、追加する**

```bash
poetry add $(cat requirements.txt)
```

`requirements.txt`にコメント行や空行が入っていてもうまく処理できるようにするには、`sed`コマンドや`grep -v`コマンドを使用する

```bash
poetry add $(sed 's/#.*$//' requirements.txt | grep -v '^\s*$' | grep -v '^\s*#')
```

- `sed 's/#.*$//' requirements.txt`：行中の`#`以降を削除（コメントを除去）
- `grep -v '^\s*$'`：空行を除外
- `grep -v '^\s*#'`：行頭が`#`の完全コメント行を除外
- 残った部分を`poetry add`に渡す

※ 上記コマンド（`poetry add`）をいきなり実行するとエラーになることがある。その際は`pyproject.toml`に以下を追加して上書き保存してから実行する

```toml
[tool.poetry]
name = "backend-study_postgresql-test-with-poetry"     # 任意のプロジェクト名
version = "0.1.0"              # 初期バージョンなど
authors = ["ご自身の名前 <your_email_address@gmail.com>"]

[tool.poetry.dependencies]
python = "3.12.11"
```

※ 上記 toml ファイルに記載する Python のバージョンは、現在ホスト PC で設定されているものを記載する。もしある特定のバージョンにしたい場合は、WSL にインストール済みの pyenv を使って特定のバージョンがホスト PC で実行されるように設定する。

3. **`pyproject.toml`の`[tool.poetry.dependencies]`セクションに以下の内容を直接編集して追記、あとで`poetry install`（または`poetry lock`）を実行する**

```toml
[tool.poetry.dependencies]
python = "^3.x"
fastapi = "0.111.0"
uvicorn = { version = "0.30.1", extras = ["standard"] }
pydantic = "2.6.4"
SQLAlchemy = "2.0.35"
psycopg = { version = "3.2.1", extras = ["binary"] }
python-dotenv = "1.0.1"
```

```bash
poetry lock # 依存関係を再構築する（poetry installでlockも行われるため、ここはわざわざ依存関係をリセットして組み直したい以外の場合はスキップして良い）
poetry install
```

依存管理したいライブラリが追加されることで、`pyproject.toml`と`poetry.lock`ができ、依存関係が管理されるようになる

`pyproject.toml`の例:

```toml
[tool.poetry]
name = "backend-study_postgresql-test-with-poetry"     # 任意のプロジェクト名
version = "0.1.0"              # 初期バージョンなど
authors = ["ご自身の名前 <your_email_address@gmail.com>"]

[tool.poetry.dependencies]
python = "3.12.11"
fastapi = "0.111.0"
uvicorn = {version = "0.30.1", extras = ["standard"]}
pydantic = "2.6.4"
sqlalchemy = "2.0.35"
psycopg = {version = "3.2.1", extras = ["binary"]}
python-dotenv = "1.0.1"
```

## 補足 .toml ファイルとは

- **Tom’s Obvious, Minimal Language**の略
- 設定ファイル（コンフィグファイル）を表すための形式
- 実体はテキストファイル
- JSON や YAML に似た役割を持つ
- `#` でコメントアウトを記載できる

## 補足 poetry コマンドの違いについて説明

- `poetry add`は 1 つずつライブラリを追加（かつ即インストール）
- `poetry install`は「まとめて入れる」コマンドで、既に`poetry.lock`があることが前提
- もし`poetry.lock`が無い場合、Poetry が自動で`poetry lock`を実行してくれる（つまり、普通に開発している限りでは、`poetry lock`はほとんど使わない。ただし、依存関係をリセットしたいときに「最後の手段」として使うことがある程度）

| コマンド                  | 実行される内容                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `poetry add パッケージ名` | 指定したライブラリをインストールし、`pyproject.toml` と `poetry.lock` を更新する                                   |
| `poetry lock`             | `pyproject.toml` の依存条件をもとに、実際に使用するライブラリのバージョンを確定して `poetry.lock` を作成・更新する |
| `poetry install`          | `poetry.lock` に書かれた確定済みのライブラリを環境にインストールする                                               |

# 3. Dockerfile を作成

- ホスト PC（WSL）上で作った`pyproject.toml`と`poetry.lock`をコンテナにコピーする（なぜ外で作って中にコピーをするのかは後述）
- `RUN poetry config virtualenvs.create false`（Poetry が自動で仮想環境（.venv）を作るのをやめる意）で Dockerfile の中でも Poetry の挙動を制御して、**仮想環境を作らずに依存をインストールする設定**をしている（なぜ仮想環境を作らない設定にしているかは後述）
- `poetry install --no-root`: このプロジェクト自体（＝ app/ 配下の自作モジュール）をインストールせず、依存パッケージだけをインストールするの意
- `--no-interaction`: ユーザー入力（Yes/No など）を求めずに自動実行するの意（Docker ビルドは 非対話モード（人が入力できない）なので、このオプションを付けないと途中で止まることがある）
- `--no-ansi`: ターミナルの色や装飾出力（ANSI カラー）をオフにするの意（ログを CI/CD や Docker のビルドログに出すときに、文字化けや色コードが混ざるのを防ぐための慣習的オプション）

```dockerfile
FROM python:3.12-slim

# システム依存パッケージ（必要なら）
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Poetry のインストール
# 公式推奨インストール方法に従う（例として以下）
RUN pip install --no-cache-dir poetry

# pyproject.toml と poetry.lock をコピー
COPY pyproject.toml poetry.lock* /app/

# 依存関係をインストール
RUN poetry config virtualenvs.create false \
    && poetry install --no-root --no-interaction --no-ansi

# アプリ本体をコピー
COPY app /app/app

# uvicorn で起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EXPOSE 8000
```

## 補足 なぜ`pyproject.toml`と`poetry.lock`は外で作って中にコピーするのか

1. 再現性（determinism）を担保

- `poetry.lock`が**依存の最終決定（確定版）**
- これをビルド時にコンテナへコピー → `poetry install` ＝ 毎回同じ依存が入る
- コンテナ内で毎回`poetry lock`（解決）すると、日によって解決結果が変わる可能性があり、再現性が落ちる

2. ビルドが速い（Docker レイヤキャッシュ）

- `COPY pyproject.toml poetry.lock /app/` → `poetry install`をソースコードコピーより前に置いておけば、依存が変わらない限り`poetry install`層がキャッシュされる
- コードだけ触って再ビルドしても依存インストールがスキップされ、爆速

3. 責務の分離 & 非対話

- **依存の解決（lock 作成）は開発フロー側（WSL/CI）**でやる
- コンテナビルドは “ロックに従ってインストールするだけ”
- Docker ビルドは非対話・再現可能にすべきで、コンテナ内で対話的に lock を生成するのはアンチパターン寄り

4. セキュリティ＆監査

- poetry.lock があると、入るバージョンが固定されるのでレビュー・検証しやすい
- 事故って勝手にメジャーアップされる…を防ぎやすい

## 補足 なぜ`poetry config virtualenvs.create false`にするのか

通常、Poetry はプロジェクトごとに仮想環境を作って依存をそこにインストールする
（たとえば ~/.cache/pypoetry/virtualenvs/... のような場所）

しかし Docker コンテナ内では、すでに環境が隔離されている（＝他のプロジェクトと混ざらない）ので、わざわざ仮想環境を作る必要は無い

そのためこの設定を入れて、「**コンテナのグローバル Python 環境に直接インストールしてね**」という挙動に変えている

# 4. `docker-compose.yml`を作成

```yml
version: '3.8' # Docker Compose（YAML）の「ファイルバージョン」

services:
  api:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload # --reloadが入っていることで、ソース変更時にAPIサーバが自動リロードされる（Dockerfileにも同コマンドがあるが、compose.ymlの内容が優先される）
    volumes:
      - ./app:/app/app:rw # volumes でホスト側 app/ をコンテナ側にマウントし、コード変更を即時反映
      - ./pyproject.toml:/app/pyproject.toml:ro # pyproject.toml と poetry.lock もマウントしておくと、依存が変更されたときも対応しやすくなる
      - ./poetry.lock:/app/poetry.lock:ro
    ports:
      - '8000:8000'
    environment:
      - PYTHONUNBUFFERED=1
```

# 5. `app/main.py`を作成

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello, Poetry + FastAPI!"}
```

# 6. Docker イメージのビルド

```bash
docker compose build
```

# 7. コンテナを起動

```bash
docker compose up
```

# 8. FastAPI サーバにアクセス

- ブラウザで <http://localhost:8000/docs> にアクセスして、Swagger UI で API を閲覧できることを確認

# 8. コンテナを停止

- `Ctrl + C`で`docker compose up`を停止
- 再度起動する場合は、同じディレクトリで`docker compose up`を実行
- 依存の追加・バージョン更新があれば、ホスト側で`poetry add`実行 →`poetry.lock`更新 → 再度`docker compose build`

# 参考 URL

1. `requirements.txt`からライブラリをまとめて`poetry add`するコマンド（`poetry add $(cat requirements.txt)`）の出典: <https://stackoverflow.com/questions/62764148/how-to-import-an-existing-requirements-txt-into-a-poetry-project?utm_source=chatgpt.com>

<!-- 以下は執筆者用メモ（公開時に削除） -->
## もし時間があれば…Todo

poetry で packages = [{ include = "app" }]が分からない。
以下の記事が書きかけ（間違いを含む）

```markdown
## `[tool.poetry]`下に書く`packages`項目について説明

- アプリケーション実行型（`packages = [{ include = "app" }]`）: `python -m uvicorn app.main:app`や`python main.py`で認識できるようになる
- ライブラリ配布型（`packages = [{ include = "mypkg" }]`）: `app/main.py`以外の`app/`配下のスクリプトを`app/main.py`でインポートできるようになる（「app/ディレクトリを、このプロジェクトの正式なパッケージ（インポート対象）として扱ってね」という宣言）

| 使い方                 | 設定例                               | フォルダ構成        |
| ---------------------- | ------------------------------------ | ------------------- |
| アプリケーション実行型 | `packages = [{ include = "app" }]`   | `app/main.py`       |
| ライブラリ配布型       | `packages = [{ include = "mypkg" }]` | `mypkg/__init__.py` |
| 単一スクリプト型       | （省略 OK）                          | `main.py` だけ      |
```

## 更新履歴

- 2025-11-10：初版公開
- 2025-11-15：スクリーンショット追加
