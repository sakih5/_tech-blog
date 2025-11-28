---
title: Github Actionsを使い始める
---

# GitHub Actions とは？

GitHub Actions（ギットハブ・アクションズ） は、GitHub が提供する **CI/CD（継続的インテグレーション / 継続的デリバリー）ツール**のことである。

Github リポジトリの中で

- テストの自動実行
- アプリのビルド
- デプロイ

などを**YAML ファイルで定義して自動化**できる。

CI/CD ツールは他にも

- Jenkins（専用サーバを立てる必要があり面倒。オンプレならこれ）
- GitLab CI（UI の構築が面倒）
- CircleCI（無料枠が少ない）
- AWS CodePipeline（ECS や Lambda にデプロイするならこれ）

がある。

# YAML ファイルの配置場所

- プロジェクトフォルダ直下に`.github/workflows/`を作成して、その中に`ci.yml`を置く。
- 自動化のワークフローを複数作成することができる。複数のワークフローを作成する場合は、`ci_hello.yml`、`ci_python.yml`というようにファイルを分ける。

# `.github/workflows/ci.yml`ファイルの書き方

- 「どんなタイミングで」「どんな環境で」「どんな処理を実行するか」を書く。
- `name:`で、Actions の画面に「今どこの処理をしているか」が表示される。
- 例 1: シェルコマンドを実行してみる

```yml
name: CI (hello) # ワークフロー名（Github上に表示）

on: [push, pull_request] # トリガー

jobs: # 実行する処理のまとまり
  echo: # ジョブの名前（好きに設定して良い）→ Actionsの画面に表示
    runs-on: ubuntu-24.04 # 実行OS（仮想マシン）
    steps: # 各ジョブの中の手順。記載順に実行される
      - uses: actions/checkout@v4 # リポジトリのコードをチェックアウト（Github公式が提供している再利用可能なスクリプトを使用）
      - run: echo "現在の時刻は $(date +"%Y-%m-%d %H:%M:%S") です。" # シェルコマンドを直接実行する
```

- 例 1 補足:

  - `runs-on:`で指定した OS（`ubuntu-24.04`）はどこにあるの？

    - GitHub のクラウド（Azure）上にある一時的な仮想マシン（VM）上にある。
    - ローカルホスト上の Ubuntu を使用しているわけではない。
    - 1 回の Workflow 実行ごとに Azure 上に「完全に新しい Ubuntu 環境」が立ち上がり、処理が終わると自動で削除される。

  - `uses: actions/checkout@v4`で指定した`actions/checkout@v4`って何？

    - デフォルトでは GitHub Actions の仮想マシンは「空っぽ」なので、**`actions/checkout`がリポジトリのソースコードを取ってきて配置してくれる**。
    - `@v4`はバージョン番号。
    - 公式の GitHub 提供アクションで、**ほぼ全ての Workflow で最初に呼ばれる**。
    - `uses:`は既存のアクション（Github が用意したテンプレート処理）を利用するの意。

- 例 2: Python スクリプトを実行してみる

```yml
name: CI (python/poetry) # Workflow の表示名（ActionsタブやPRのChecksタブに出る）

on: # いつ走らせるか（トリガー）
  pull_request: # PRが作成/更新されたら実行
  push: # push されたら実行
    branches: [main] # ただし push は main ブランチだけを対象

jobs:
  test: # ジョブ名（任意）。この中が1つの実行単位
    runs-on: ubuntu-24.04 # 実行用の仮想マシン（GitHubホストのUbuntuイメージ）

    concurrency: # 「同じWorkflow＋同じブランチ」で走ってる古いRunをキャンセルする
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true

    env: # ジョブ全体で使う環境変数（後続の steps から参照できる）
      POETRY_VERSION: 2.2.1
      PYTHON_VERSION: '3.12.11'

    steps:
      - uses: actions/checkout@v4
        # リポジトリのソースコードを runner にチェックアウト（必須の第一歩）

      - name: Set up Python # ← nameは各ステップに分かりやすいラベルを付けるための項目（ワークフロー同様、GitHub Actionsのログ画面で分かりやすく表示される）
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
        # 指定したバージョンのPythonをインストール＆パスを通してくれることで、以降のrun:で使えるようにする（Github公式が提供している再利用可能なスクリプトを使用）

      - name: Install Poetry
        run: pipx install poetry==${{ env.POETRY_VERSION }}
        # Poetry は「Pythonアプリを作るためのツール」なので、pipxを使うことでプロジェクトの依存から切り離す

      - name: Cache Poetry virtualenvs
        uses: actions/cache@v4 # actions/cache は、特定のフォルダやファイルを保存しておいて、次回の実行時に復元するためのツール
        with:
          path: ~/.cache/pypoetry/virtualenvs # キャッシュする対象ディレクトリを指定（Poetryで各プロジェクトの仮想環境が格納されている）
          key: poetry-${{ runner.os }}-${{ env.PYTHON_VERSION }}-${{ hashFiles('**/poetry.lock') }} # キャッシュの「名前（キー）」を定義
          # ↑ hashFiles('**/poetry.lock')は、poetry.lock ファイルの内容をハッシュ化した値（依存関係の状態）
          #   -> lock が変わる（依存が変わる）とキャッシュは無効化されて再生成される
          # 最初のCI実行時にpoetry.lock が無いとこの仕組みはうまく行かなくなる（hashFiles('**/poetry.lock') が空文字列になるため、key が毎回同じ "poetry-OS-Python-" に固定されてしまう）
          # → その結果、最初に作成されたキャッシュが常にヒットし続け、依存関係が変わっても新しいキャッシュが作成されない（キャッシュが更新されない）状態になる。
          restore-keys: |
            poetry-${{ runner.os }}-${{ env.PYTHON_VERSION }}-
          # 完全一致が無いときに “前方一致” で近いキャッシュを探して、以前のキャッシュをベースに高速で構築できる

      - name: Install deps
        run: poetry install --no-interaction --no-ansi
        # 依存をインストール（poetry.lock に従う）
        # --no-interaction: 対話なし、--no-ansi: 色制御文字を出さない（ログを見やすく）

      - name: Show env (debug)
        run: |
          poetry --version
          poetry env info
          python --version
          pip list | head -n 50
        # 実行環境のダンプ。詰まった時の初動デバッグに有効（無害なので常設OK）

      - name: Lint (ruff) - optional
        continue-on-error: true
        run: |
          if poetry show ruff > /dev/null 2>&1; then
            poetry run ruff check .
          else
            echo "ruff not found. Skipping."
          fi
        # ruff（Python の Linter）が依存に入っている時だけ lint を実行
        # continue-on-error: true なので lint 失敗でもCI全体は落とさない（任意の運用）

      - name: Run tests (pytest)
        run: poetry run pytest -q
        # テスト実行。-q は quiet（短い出力）
        # pytest は既定で tests/ 配下の test_*.py / *_test.py を自動検出
```

- 例 2 補足:

  - 変数

    - `${{ github.workflow }}`: Workflow 名（ここでは “CI (python/poetry)”）
    - `${{ github.ref }}`: 実行対象の ref（例: refs/heads/main）
    - `${{ env.PYTHON_VERSION }}` など: さきほど`env:`で定義した環境変数
    - `${{ runner.os }}`: ランナー OS 名（Linux/Windows/macOS）
    - `hashFiles('**/poetry.lock')`: リポ内の poetry.lock をハッシュ化してキャッシュキーに使う

  - `github.ref`とは？

    - フルパスの Git 参照のこと。
    - 似ているが`github.ref_name`だと、ブランチ名・タグ名など（`main`など）が取得される。
    - 例:

      | イベント                      | **値（github.ref）**           | 意味                                                   |
      | ----------------------------- | ------------------------------ | ------------------------------------------------------ |
      | `push` (main に push)         | `refs/heads/main`              | main ブランチへの push                                 |
      | `push` (feature ブランチ)     | `refs/heads/feature/add-login` | feature ブランチへの push                              |
      | `pull_request`                | `refs/pull/12/merge`           | PR 番号#12 のマージ用 ref（GitHub が作る一時ブランチ） |
      | `tag` push                    | `refs/tags/v1.0.0`             | タグ v1.0.0 の push                                    |
      | 手動実行（workflow_dispatch） | `refs/heads/<指定ブランチ>`    | 実行時に選んだブランチ                                 |

  - `concurrency:`（「同じ Workflow ＋同じブランチ」で走ってる古い Run をキャンセルする処理）はなぜ入れているの？

    - そもそも`concurrency:`では、**同時実行**に関する設定ができる。
    - `cancel-in-progress: true`と記載することで、**同時に複数の CI が動くことを防ぐ**。
    - 同時に複数の CI が動くことを防がないと、例えば**main ブランチに 3 回連続で push した**ときに、GitHub Actions が 3 回それぞれ走ってしまい、テストやビルド、デプロイが同時に 3 本走って、

      - 無駄に時間・リソースがかかる。
      - デプロイ系では「古いコードで上書き」みたいな事故も起こる。

  - なぜ`pipx`を使っているの？`pip`じゃダメなの？

    - Poetry は「Python アプリを作るためのツール」であるため、**そのツール自身はプロジェクトの依存とは切り離すのが正しい**から。

      - `pip`で`poetry`を入れてしまうと、**プロジェクトフォルダ直下**にある`venv`で管理されるようになり、他のライブラリと混ざってバージョン衝突や依存汚染が起きる可能性がある。
      - `pipx`で`poetry`を入れることで、**グローバル直下**の`pipx`ディレクトリ配下に`poetry`独自の仮想環境が作られ、`poetry`自体の依存とプロジェクトの依存が完全に分離される。

  - なぜ Poetry の仮想環境をキャッシュするの？

    - Github Actions では、毎回「まっさらな Ubuntu VM」が立ち上がるため、通常は`poetry install`のたびに全ライブラリを再インストールする必要がある → これに数分～十数分かかる
    - しかし、キャッシュがあるとそれを復元するだけになるため、**数秒で終わる**
    - Github Actions では、リポジトリごとに**最大 10GB まで**キャッシュを保存可能（古い順に削除される・キャッシュはリポジトリ単位・同じリポジトリでもブランチが違うと別キャッシュになることがある）
