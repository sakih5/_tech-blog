---
title: FastAPIでバックエンドサーバを構築する(実装編)
publishedDate: 2025-08-23
---

# FastAPI 超入門メモ: Todo API を立ててみて気づいたこと

## 記事概要

| 項目 | 内容 |
| ---- | ---- |
| 難易度 | ★★☆☆☆（FastAPI初めての人が、基本的な CRUD APIを実装できるレベルになる）|
| 所要時間 | 約30分（Docker コンテナを立てて、Todo API が動く状態まで）|
| 検証環境 | Windows 11 + WSL2 (Ubuntu 24.04) |
| 目的 | FastAPI を使って Todo アプリ用の API（CRUD）を構築し、Swagger UI で動作を確認する方法をまとめた記事 |

## 本記事を作成した背景

FastAPIを使ってみたいと思い、本記事を作成しました。

## 本記事で取り組んだこと

- FastAPI で何ができるか（API作成/ルーティング/バージョニングetc）、試してみて気づいたことをまとめました。
- **Todo アプリ用 API**を想定して、基本的な CRUD 操作を実装してみました。
- **Swagger UI**で、作成した API の動作確認をしてみました。
- 将来的にUI（フロントエンド）からAPIを呼び出すことを想定し、CORSを設定しました。
- DB との接続はしていない。簡単のため、データはスクリプトに埋め込んでいる（※今後分離を試みる予定）

## 手順

### 前提

- **環境**: Windows 11 + WSL2 (Ubuntu 24.04)
- **前提知識**: Pythonで何かしらプログラムを作ったことがある
- **前提状態**: DockerとGitがインストール済

※ DockerはWSL2上にDocker Engineのみインストール済（Windows PC に Docker Desktop はインストールしていない）

### 手順1: APIの設計をする

APIの設計は、以下のような順番で考える。

1. 画面とやりたいことを洗い出す
2. それに必要な「データの形（モデル）」を決める
3. モデルごとにリソースを分けて、基本CRUDのAPIを置く
4. 特殊な処理（CSVエクスポートなど）は “行為” としてAPIを追加する
5. フロントからの使われ方をイメージしつつ微調整

詳細は

を参照のこと。

### 手順2: FastAPIプロジェクトの構成をつくる

#### 🎯 目的

FastAPIでTodo APIを開発するための基本ディレクトリ構成を整える。

#### 🛠️ 手順詳細

```bash
# プロジェクトディレクトリを作成
mkdir -p ~/projects/backend-study_fastapi-test/app/{routers,schemas}

# 空の __init__.py を作成
touch ~/projects/backend-study_fastapi-test/app/__init__.py
touch ~/projects/backend-study_fastapi-test/app/routers/__init__.py
touch ~/projects/backend-study_fastapi-test/app/schemas/__init__.py
```

```txt
/home/ユーザ名/projects/
└──  backend-study_fastapi-test/
    ├── app                     # FastAPIのソースコードはここに集約
    │   ├── __init__.py
    │   ├── main.py             # 後述にて作成
    │   ├── schemas
    │   │   ├── __init__.py
    |   |   ├── todo.py         # 後述にて作成
    |   |   └── category.py     # 後述にて作成
    │   └── routers
    |       ├── __init__.py
    |       ├── todos.py        # 後述にて作成
    |       └── categories.py   # 後述にて作成
    ├── Dockerfile              # 後述にて作成
    ├── requirements.txt        # 後述にて作成
    └── compose.yml             # 後述にて作成
```

#### 💡 理解ポイント

- FastAPIでは`app/`をアプリのルートにして、`routers/`配下に**APIの中身の処理**を分割して入れて、`schemas/`配下に**Pydanticによる型定義**を入れるのが定番構成。
- `__init__.py`はPythonに「ここはパッケージですよ」と知らせる**目印**。これがないと`from app.routers import todos`のようなimportが失敗する。

#### 📝 補足

- `__init__.py`の中身は空でOK。
- パス解決エラー（例: `ModuleNotFoundError: No module named 'app.routers'`）が出たら、`app/`の構成とファイル名を再確認。
- 上記参考: `app/`の構成は`tree パス -L 4`といったコマンドでターミナル上に出力可能。出力しておかしなところが無いかChatGPTに簡単に相談できる
- Python のパッケージ解決とは？ → **「解決（resolve）」= Python が`import`文をどう辿って目的のモジュールを見つけるか**という仕組みのこと。
- Python のパッケージ解決の仕組み: Python が`import`を実行するときは 1. **モジュール**（単一の.py ファイル） 2. **パッケージ** （`__init__.py`を含むディレクトリ）の順で探す。※ `__init__.py`がないと、そのディレクトリはただのフォルダ扱いで import できない（こともある）

### 手順2: メインアプリ（`app/main.py`）を作成

#### 🎯 目的

FastAPIアプリの中核となるappインスタンスを定義し、
CORS設定・ルーター登録・ヘルスチェックを追加する。

#### 🛠️ 手順詳細

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import todos, categories

# appインスタンス定義
app = FastAPI(
    title="Todo API (in-memory)",
    version="1.0.0",
    description="Todoを管理するAPI (CRUD機能有、データはインメモリで所有)",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,            # ← 「CORSを扱うミドルウェア」を追加
    allow_origins=["*"],       # ← どのオリジン（サイト）を許可するか
    allow_credentials=True,    # ← Cookieや認証情報を一緒に送ることを許可するか
    allow_methods=["*"],       # ← どのHTTPメソッド（GET, POSTなど）を許可するか
    allow_headers=["*"],       # ← どんなHTTPヘッダを許可するか
)

# ルーター登録
app.include_router(todos.router, prefix="/v1")
app.include_router(categories.router, prefix="/v1")

# ヘルスチェック
@app.get("/health", tags=["health"], summary="ヘルスチェック")
def health():
    return {"status": "ok"}
```

#### 💡 理解ポイント

- `app = FastAPI()`で作成されるのがASGIアプリ本体。
- `@app.get("/health")`のようなデコレータでエンドポイントを登録。
- `/v1/`のprefixでAPIのバージョン管理を簡単に実現（**URLパス方式**によるバージョニング）

#### 📝 補足

- `app = FastAPI()`の`()`の中に`title`や`version`、`description`を書くことで、Swagger UI（`/docs`）に反映される。
- 開発中のCORSは`"*"`（全許可の意）でOKだが、本番では限定したオリジン（例: `http://localhost:3000`）のみ許可する。
- `/health`はサーバーが起動してリクエストを受け付けられる状態か確認する用のもの。Zabbixなどの監視にも利用可能。
- オリジンとは？ → 「プロトコル（例: `http://`） + ドメイン（例: `localhost`） + ポート番号（例: `3000`）」のセット
- CORS（コース）とは？ → 異なるオリジン間でリソースを共有できるようにする仕組み（Cross-Origin Resource Sharing、クロスオリジン通信とも言う）。ローカル開発でよくある組み合わせとして、フロント：<http://localhost:3000> 、バックエンドAPI：<http://localhost:8000> とするが、<http://localhost:3000> から <http://localhost:8000> にアクセスしようとすると、これらはオリジンが異なるため、Webブラウザが危険と判断して通信をブロックしてしまう（**同一オリジンポリシー（Same-Origin Policy）**）
- `CORSMiddleware`は、FastAPIでCORS（クロスオリジン通信）を許可するミドルウェアの設定。`allow_origins=["*"]`と`allow_credentials=True`を組み合わせるのはセキュリティ上NG。

### 手順3: スキーマ（`schemas/`）を定義

#### 🎯 目的

PydanticモデルでAPIの入出力形式を定義し、
FastAPIが自動で型検証・ドキュメント化できるようにする。

#### 🛠️ 手順詳細

```python
# app/schemas/todo.py
from datetime import date
from typing import Optional
from pydantic import BaseModel, Field

# 共通項目
class TodoBase(BaseModel): # それぞれの型指定の意味を書く
    content: str = Field(..., min_length=1, max_length=200, description="内容")
    due: date = Field(..., description="期限 (YYYY-MM-DD)")
    category: Optional[str] = Field(None, max_length=50, description="分類")
    priority: int = Field(3, ge=1, le=5, description="重要度(1=低〜5=高)")

# 新規作成用の入力スキーマ
class TodoCreate(TodoBase): pass

# 更新用（全ての項目が任意）
class TodoUpdate(BaseModel): # それぞれの型指定の意味を書く
    content: Optional[str] = Field(None, min_length=1, max_length=200)
    due: Optional[date] = None
    category: Optional[str] = Field(None, max_length=50)
    priority: Optional[int] = Field(None, ge=1, le=5)

# レスポンス用（id付き）
class Todo(TodoBase): # なぜ元の共通項目にIDをつけていないのか聞く
    id: int = Field(..., description="識別子")
```

#### 💡 理解ポイント

- `BaseModel`を継承して定義することで、**型チェック・自動補完・Swagger UIでのスキーマ表示**が有効に。
- `Field(..., )`の`...`は「この項目は**必須項目**ですよ（デフォルト値が無いけど、入力時には必ず必要。無いとエラーになる）」を意味する。**エリプシス（Ellipsis）**と呼ばれる特別なオブジェクト。
- `TodoCreate`, `TodoUpdate`, `Todo`を分けると役割が明確。

#### 📝 補足

- 日付やOptional型の扱いで混乱しがちなので型ヒントを丁寧に書くと◎。

### 手順4: ルーター（`routers/todos.py`）を定義

#### 🎯 目的

Todoの一覧取得・追加・更新・削除を行うAPIを定義する。

#### 🛠️ 手順詳細

```python
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Path, Response
from datetime import date
from typing import Dict, List
from app.schemas.todo import Todo, TodoCreate, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])

# ========= In-memory Store =========

_TODOS: Dict[int, Todo] = {}
_NEXT_ID: int = 1

def _seed_data() -> None:
    global _NEXT_ID
    samples = [
        {
            "content": "ご飯を炊く",
            "due": date.fromisoformat("2025-10-12"),
            "category": "家事",
            "priority": 4,
        },
        {
            "content": "PostgreSQLの移行手順を整理",
            "due": date.fromisoformat("2025-10-15"),
            "category": "仕事",
            "priority": 5,
        },
        {
            "content": "Vue.jsのUdemy視聴（25%完了）",
            "due": date.fromisoformat("2025-10-20"),
            "category": "勉強",
            "priority": 3,
        },
    ]
    for s in samples:
        _TODOS[_NEXT_ID] = Todo(id=_NEXT_ID, **s)
        _NEXT_ID += 1

if not _TODOS:
    _seed_data()

# ========= Handlers =========

@router.get("/", response_model=List[Todo], summary="Todo一覧を取得")
def list_todos() -> List[Todo]:
    """priority（重要度）が高い順にソートして、Todo（内容・期限・カテゴリ・重要度）を取得する"""
    todos_sorted = sorted(_TODOS.values(), key=lambda t: t.priority, reverse=True)
    return todos_sorted

@router.post("/", response_model=Todo, status_code=201, summary="新規Todoを追加")
def create_todo(payload: TodoCreate) -> Todo:
    global _NEXT_ID # Pythonの関数内でグローバル変数を更新するには global 宣言が必要
    todo = Todo(id=_NEXT_ID, **payload.model_dump()) # .model_dump()でTodoCreateモデルを辞書（dict）に変換、さらに、辞書を**で「キーワード引数展開」をして Todo に渡す
    _TODOS[_NEXT_ID] = todo
    _NEXT_ID += 1
    return todo

@router.patch("/{todo_id}", response_model=Todo, # payloadから更新された後の1件のTodoをJSONで返す
    summary="既存のTodoを修正（部分更新可）"
)
def update_todo(
    todo_id: int = Path(..., ge=1),
    payload: TodoUpdate = ..., # TodoUpdateもエリプシス。更新したい値以外の項目の値はNoneで入ってくる
) -> Todo:
    # _TODOS に指定されたIDが存在しなければ、404エラー（Not Found）を返す
    if todo_id not in _TODOS:
        raise HTTPException(status_code=404, detail="Todo not found")

    # 現在のデータを取得
    current = _TODOS[todo_id] # 既存のTodoオブジェクトを取得
    data = current.model_dump() # .model_dump() により dict（辞書）形式 に変換

    updates = payload.model_dump(exclude_unset=True)  # exclude_unset=True により、「リクエストで送られた項目だけ」辞書に変換

    # updates に含まれるキー・値を data に上書き
    for k, v in updates.items():
        if v is not None: # v is not None により「Noneで上書き」は防ぐ
            data[k] = v

    # 新しいTodoオブジェクトを作り直す
    updated = Todo(**data) # data 辞書から新しい Todo インスタンスを再生成
    _TODOS[todo_id] = updated # _TODOS の該当IDの値を上書き

    return updated # 更新後のTodoを返す

@router.delete(
    "/{todo_id}",
    response_class=Response, # デフォルトはJSONResponse。ResponseにすることでJSONでない形式（空）を返せるようになる
    summary="Todoを削除"
)
def delete_todo(todo_id: int = Path(..., ge=1)) -> Response:

    # パスパラメータに含まれるtodo_idがTodo一覧に実在しない場合はエラーを返す
    if todo_id not in _TODOS:
        raise HTTPException(status_code=404, detail="Todo not found")

    # パスパラメータに含まれるtodo_idがTodo一覧に実在する場合は削除される
    del _TODOS[todo_id]

    return Response(status_code=204)
```

#### 💡 理解ポイント

- APIRouterでモジュールごとにエンドポイントを整理できる。
- In-memory（メモリ上）でデータを管理しているため、DB不要で動作。
- CRUDを1ファイルで完結でき、構造がシンプル。
- APIの定義の仕方は以下:

    ```python
    @appやrouter.getやpost(
        エンドポイントのURL（例: /todos/）,
        response_model=schema/で定義した型（例: List[Todo]）,
        status_code=201（ほかにも404など）,
        summary=このAPIの説明。Swagger UIに表示される（例: "Todo一覧を取得"）
        )
    def API名(payload: schema/で定義した型) → schema/で定義した型:
        処理
        return APIをたたくと返ってくるもの
    ```

- 上記において`payload`とは、クライアントが送ったリクエストボディ(JSON)を、指定したPydanticモデルとして自動的に受け取る、の意。

#### 📝 補足

- 再起動するとデータは消える（永続化なし）。
- Pydantic v2では`.model_dump()`で辞書に変換。
- PATCHでexclude_unset=Trueを使うと部分更新が安全。

```

## サンプルコード

- 以下サンプルコードでは、データを DB に分離できておらず、スクリプトの中に埋め込んでしまっている

  ← まずは FastAPI の基本理解を優先するためにそうしている

- `todos.py`で Todo 一覧の取得、新規 Todo 追加、既存 Todo 更新、Todo 削除を行い、`categories.py`でカテゴリ一覧の取得、新規カテゴリ追加、既存カテゴリ更新、カテゴリ削除を行うことができる。なお、カテゴリとは、Todo の種類のことである。例えば「ご飯を炊く」という Todo のカテゴリは「家事」である

### `app/routers/todos.py`: `/todos`配下の API を定義したスクリプト。Todo 一覧を格納した DB から情報を取り出したり、新しい Todo を追加したり、既存の Todo を更新したり、削除したりする



- 補足）`app/routers/todos.py`で定義したエンドポイントまとめ

  | 処理の種類 | メソッド | パス                  | 役割               | ステータス |
  | ---------- | -------- | --------------------- | ------------------ | ---------- |
  | CREATE     | POST     | `/v1/todos/`          | 新規 Todo を追加   | 201        |
  | READ       | GET      | `/v1/todos/`          | Todo 一覧を取得    | 200        |
  | UPDATE     | PATCH    | `/v1/todos/{todo_id}` | 既存の Todo を修正 | 200/404    |
  | DELETE     | DELETE   | `/v1/todos/{todo_id}` | Todo を削除        | 204/404    |

### `app/schemas/category.py`: `/categories`配下の API の**入出力データの形式**を Pydantic で定義したスクリプト

```python
from pydantic import BaseModel, Field
from typing import Optional

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="カテゴリ名")

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)

class Category(CategoryBase):
    id: int = Field(..., description="カテゴリID")
```

- `app/routers/categories.py`: `/categories`配下の API を定義したスクリプト。Todo のカテゴリについて編集する

```python
from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter, HTTPException, Path, Response

from app.schemas.category import Category, CategoryCreate, CategoryUpdate
from app.routers.todos import _TODOS  # Todoデータの辞書（インメモリ）をインポート → カテゴリ変更時にTodo側へも反映するため

router = APIRouter(prefix="/categories", tags=["categories"])

# ========== In-memory Store for Categories ==========

_CATEGORIES: Dict[int, Category] = {} # カテゴリIDをキー、Categoryモデルを値とする辞書
_NEXT_CAT_ID: int = 1 # 新規カテゴリ追加時の採番カウンタ

# ========== Helpers ==========

def _find_category_by_name(name: str) -> Category | None:
    """
    名前（大文字小文字・空白を無視）でカテゴリを検索。同名カテゴリの重複登録を防ぐために利用
    """
    lower = name.strip().lower()

    # 重複が無い場合はNoneを、重複がある場合は既存のカテゴリ名を返す
    for c in _CATEGORIES.values():
        if c.name.strip().lower() == lower:
            return c
    return None

def _propagate_category_rename(old_name: str, new_name: str) -> None:
    """
    カテゴリ名の変更をTodoへ反映（category文字列を全置換）
    """
    for todo_id, todo in _TODOS.items():
        if todo.category and (todo.category.strip().lower() == old_name.strip().lower()):
            # Pydanticモデルを一旦 .model_dump() でdictにして上書きして編集
            data = todo.model_dump()
            data["category"] = new_name

            # -> 今の todo と同じ型（例：Todo）を使って、dict から新しいインスタンスを作り直す type(todo) = Todo
            _TODOS[todo_id] = type(todo)(**data)

def _propagate_category_delete(name: str) -> None:
    """
    カテゴリ削除時、該当TodoのcategoryをNoneへ
    """
    for todo_id, todo in _TODOS.items():
        if todo.category and todo.category.strip().lower() == name.strip().lower():
            # Pydanticモデルを一旦 .model_dump() でdictにして上書きして編集
            data = todo.model_dump()
            data["category"] = None

            # -> 今の todo と同じ型（例：Todo）を使って、dict から新しいインスタンスを作り直す type(todo) = Todo
            _TODOS[todo_id] = type(todo)(**data)

def _seed_categories_if_empty():
    """
    初期起動時にサンプルカテゴリを登録する
    """
    global _NEXT_CAT_ID
    if _CATEGORIES:
        return
    seeds = ["家事", "仕事", "勉強"]
    for nm in seeds:
        _CATEGORIES[_NEXT_CAT_ID] = Category(id=_NEXT_CAT_ID, name=nm)
        _NEXT_CAT_ID += 1

# 最後に一度呼んで初期化
_seed_categories_if_empty()

# ========== Handlers ==========

@router.get(
    "/",
    response_model=List[Category],
    summary="カテゴリ一覧を取得"
)
def list_categories() -> List[Category]:
    return [_CATEGORIES[k] for k in sorted(_CATEGORIES.keys())]

@router.post(
    "/",
    response_model=Category,
    status_code=201,
    summary="カテゴリを追加"
)
def create_category(payload: CategoryCreate) -> Category:
    global _NEXT_CAT_ID
    if _find_category_by_name(payload.name):
        raise HTTPException(status_code=409, detail="Category already exists")
    cat = Category(id=_NEXT_CAT_ID, name=payload.name)
    _CATEGORIES[_NEXT_CAT_ID] = cat
    _NEXT_CAT_ID += 1
    return cat

@router.put(
    "/{category_id}",
    response_model=Category,
    summary="カテゴリ名を更新"
)
def update_category(
    category_id: int = Path(..., ge=1),
    payload: CategoryUpdate = ...,
) -> Category:
    if category_id not in _CATEGORIES:
        raise HTTPException(status_code=404, detail="Category not found")

    current = _CATEGORIES[category_id] # 現在のカテゴリ名を取得
    updates = payload.model_dump(exclude_unset=True) # 変更後のカテゴリ名を取得（updates["name"]に入っている）

    # 変更後のカテゴリ名が空欄かチェック
    # "name" in updatesを入れることで、リクエストボディにnameが無いケース（空JSONなど）でも落ちないようにしている
    if ("name" in updates) and (updates["name"] is not None):

        # name更新時の重複チェック
        new_name = updates["name"]
        existed = _find_category_by_name(new_name)
        if existed and existed.id != category_id:
            raise HTTPException(status_code=409, detail="Category name already in use")

        old_name = current.name
        updated = Category(id=current.id, name=new_name)
        _CATEGORIES[category_id] = updated

        # Todo側へ反映
        _propagate_category_rename(old_name, new_name)
        return updated

    # 変更後のカテゴリ名が空欄ならそのまま現在のカテゴリ名を返す
    return current

@router.delete(
    "/{category_id}",
    response_class=Response, # デフォルトはJSONResponse。ResponseにすることでJSONでない形式（空）を返せるようになる
    summary="カテゴリを削除"
)
def delete_category(category_id: int = Path(..., ge=1)) -> None:
    if category_id not in _CATEGORIES:
        raise HTTPException(status_code=404, detail="Category not found")

    removed = _CATEGORIES.pop(category_id)

    # Todo側の同名カテゴリをNoneに
    _propagate_category_delete(removed.name)

    return Response(status_code=204)
```

- 補足）`app/routers/categories.py`で定義したエンドポイントまとめ

  | 処理の種類 | メソッド | パス                           | 役割                   | ステータス |
  | ---------- | -------- | ------------------------------ | ---------------------- | ---------- |
  | CREATE     | POST     | `/v1/categories/`              | 新規 カテゴリ を追加   | 201        |
  | READ       | GET      | `/v1/categories/`              | カテゴリ 一覧を取得    | 200        |
  | UPDATE     | PUT      | `/v1/categories/{category_id}` | 既存の カテゴリ を修正 | 200/404    |
  | DELETE     | DELETE   | `/v1/categories/{category_id}` | カテゴリ を削除        | 204/404    |

## サンプルコード(環境まわり)

### `Dockerfile`

```dockerfile
# ベースイメージの指定。slim は余計なツールが少ないため、サイズが小さく脆弱性表面も狭い
FROM python:3.12-slim

# 環境変数の設定
# PYTHONDONTWRITEBYTECODE=1：__pycache__/（.pyc）を生成しない。不要なファイルを減らし、レイヤを汚さない
# PYTHONUNBUFFERED=1：標準出力をバッファリングしない。ログがすぐに出る（K8sやComposeでデバッグしやすい）
# PIP_NO_CACHE_DIR=off：pip のダウンロードキャッシュを保持する/しないの挙動。off はキャッシュを許可（ビルド時の再ダウンロードを減らす）。サイズと速度のトレードオフである
# PIP_DISABLE_PIP_VERSION_CHECK=on：実行時の pip バージョンチェックを抑止して起動を速く静かにする
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

# 作業ディレクトリ。Dockerfileに対して相対パスで記載される
# 以降の COPY や RUN の基準パスになる
# uvicorn app.main:app の app/ ディレクトリをここに置く前提を作る
WORKDIR /app

# /appディレクトリは置いといて、先にrequirement.txtだけコピーすることにより、requirement.txtが前回と同じ内容であれば次のRUN pip installがスキップされてビルドにかかる時間が短縮する

# COPY <コピー元> <コピー先>
# コピー元：ビルドコンテキスト（通常は docker build を実行したディレクトリ配下）のファイルやフォルダ
# コピー先：イメージ内のパス（この時点の WORKDIR が基準になる）
# → つまり、ホストの requirements.txt を、イメージの /app/requirements.txt にコピーする

# pip install --upgrade pip：新しめの pip で解決の安定性を狙う
# pip install -r requirements.txt：実行時依存のみを入れる。開発専用ツール（lint/test）は別ファイルに分けるとイメージを細く保てる
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ここが開発と本番の分岐点。本番用にビルドする場合はコメントアウト解除
# 開発：後述の Compose で ./app:/app/app をマウントし、ホットリロード運用するので COPY しない
# 本番：ホストに依存せずイメージ単体で完結させるため、COPY を有効化してコードを取り込む
# → したがって本番ビルド時は以下のコメントを外す（or ビルド引数やステージ分けで切り替える）
# COPY app ./app

# コンテナが待ち受けるポートのメタ情報。公開はしない（公開は -p 8000:8000 などランタイム側で行う）
# ドキュメント性・ツール連携のために記載しておく
EXPOSE 8000

# デフォルト CMD は compose.yml で上書きされる（開発だと --reloadオプションが追加されている）
# 既定の起動コマンド。ASGI サーバの Uvicorn に app.main:app（/app/app/main.py の app 変数）を渡す
# 開発時は Compose 側で --reload を付けてホットリロードに切り替える（本番では --reload は使わない）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- 補足）なぜ本番は`Dockerfile`で`app`ディレクトリ丸ごとコンテナにコピーするのに、開発は`compose.yml`でコンテナ上に`app`ディレクトリ丸ごとをマウントしているのか？

  → 開発のときは、コードの変更をこまめにチェックしたいが、本番のときは、コードを変えたときに勝手にアプリに反映されてほしくないから

  開発:

  - ソース変更を即時反映させたい → ホストの ./app をコンテナの /app/app にボリュームマウント
  - Uvicorn に --reload を付けると、ファイル監視 → 自動再起動で素早く反映

  本番:

  - デプロイ物を不変（immutable）にしたい → アプリコードを COPY してイメージ内に封入
  - ホスト環境差分に影響されず、再現性・移植性が高い
  - `--reload`はオフ、プロセス数やワーカーは gunicorn+uvicorn workers 構成などに寄せてもよい

### `compose.yml`(開発用を記載。本番の際は`command:`の行をコメントアウトする)

```yaml
# Compose ファイルのトップキー。ここに複数のサービス(コンテナ定義)を列挙できる
# 今回は api というサービス(FastAPIアプリ)を1つだけ持つ
services:
  # サービスの名前。この名前で docker compose up api のように呼び出せる
  api:
    build:
      context: . # `.`はプロジェクトルート(compose.yml がある場所)。Docker build に渡されるビルドコンテキストになる
      dockerfile: Dockerfile # ビルドに使う Dockerfile を明示。通常は省略しても ./Dockerfile が使われるが、わかりやすさのため指定している
    container_name: fastapi-api # 実行時のコンテナ名を固定する(省略しても良いが、プロジェクト名やサービス名などをハイフン区切りにして自動で命名される)
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload # コンテナ起動時に実行するコマンド(Dockerfileにも書いてあるが、compose.ymlに書いてある情報で上書きされる)
    # app.main:app = /app/app/main.py の中にある app という FastAPI インスタンスを探す指定
    # --host 0.0.0.0 = コンテナ外(ホストPCや他コンテナ)からアクセス可能にするため
    # --port 8000 = サービスが待ち受けるポート
    # --reload = ソース変更を監視して自動リロードする。開発専用
    volumes:
      - ./app:/app/app:rw
    # ホストの ./app ディレクトリを、コンテナの /app/app にマウント
    # WSL 上のワークスペースで編集したコードが、コンテナ内に即反映される
    # :rw は read-write 権限。省略しても同じ意味だが明示されている
    ports:
      - '8000:8000'
    # ホストPCの 8000番ポート → コンテナの8000番ポート に転送
    # ブラウザで http://localhost:8000 にアクセスすれば FastAPI に届く
    # 左側（ホスト側）は変えてもよい（例: "8080:8000" なら http://localhost:8080 でアクセス）
```

### `requirements.txt`

```txt
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic==2.6.4
```

## 動作確認

- `docker compose up`で、`compose.yml`に基づいて、まだイメージが無ければ`Dockerfile`からイメージをビルドし、イメージがあればそれを使ってコンテナを生成するという意
- `--build`オプションをつけることで、**サービス起動の前に必ずイメージを再ビルドする**設定にできる。既にイメージがあっても、Dockerfile や依存が変わったかどうかに関係なく新しくイメージを生成する

  ```bash
  docker compose up --build
  ```

- <http://localhost:8000/docs> で Swagger UI の画面を開く

  ![imgs/FastAPIテスト画面イメージ](/_articles/images/imgs/FastAPIテスト画面イメージ2.png)

- <http://localhost:8000/health> で {"status":"ok"}が見れる

---

# FastAPI 特有の概念

## 1. FastAPI における`app`インスタンスとは何か？

- `FastAPI`クラスを呼び出して生成したオブジェクト
- **ASGI アプリケーションそのもの**
- エンドポイントやミドルウェアを登録して管理する中核であり、かつ、OpenAPI ドキュメントを生成するベースとなる

### 補足 1: ASGI アプリケーションとは？

- ASGI (Asynchronous Server Gateway Interface) は、Python 製 Web アプリやフレームワークと Web サーバーをつなぐための「共通インターフェース仕様」
- 従来の WSGI が同期処理しか扱えなかったのに対し、ASGI は非同期処理や WebSocket などリアルタイム通信にも対応可能
- Uvicorn などの ASGI サーバーが HTTP リクエストを ASGI イベント形式に変換し、FastAPI や Starlette といったアプリが処理を行う

### 補足 2: Uvicorn とは？

- ASGI サーバーの代表的な実装で、Python の非同期アプリケーションを高速に動かすための Web サーバー
- 内部では asyncio や uvloop を利用して効率的にイベントループを回し、高スループットを実現
- FastAPI や Django Channels を動かす際のデファクト標準サーバーであり、開発用のホットリロードや本番用のマルチワーカーもサポート

## 2. エンドポイントとは

- 外部からサービスにアクセスするための入り口（URL）のこと
- エンドポイントは URL の一部（末尾）に過ぎず、「ベース URL + エンドポイント」で完全なアクセス先の URL になる
- 例 1: サーバーが <http://localhost:8000> で動いているなら → <http://localhost:8000/users>
- 例 2: デプロイ後に <https://api.example.com> で動いているなら → <https://api.example.com/users>
- 同じエンドポイント名でも、HTTP メソッド（GET / POST / PUT / DELETE …）によって処理を分けられる
- ただし、当たり前ではあるが、同じメソッド＋同じエンドポイントを二重に書くと最初に書いた処理が無視される（後（下）に書いた処理で上書きされる）

## 3. デコレータとは

- 関数やクラスに、新しい機能を後から付け足す仕組み
- 元の関数のコードを直接書き換えずに、処理を前後に挟み込むことができる
- 「@デコレータ名」と記載し、デコレータを適用したい関数の真上の行に記載する
- 簡単な例）`@my_decorator`がデコレータで、hello 関数実行時に適用される

  ```python
  def my_decorator(func):
      def wrapper():
          print("前処理：関数が呼ばれる前に実行")
          func()
          print("後処理：関数が呼ばれた後に実行")
      return wrapper

  @my_decorator
  def hello():
      print("Hello, world!")

  hello()
  ```

  以下、実行結果

  ```txt
  前処理：関数が呼ばれる前に実行
  Hello, world!
  後処理：関数が呼ばれた後に実行
  ```

### 補足 1: FastAPI におけるデコレータの役割とは

- FastAPI におけるデコレータの役割とは、ルーティング定義をすること
- ルーティング定義とは？

  - 「どの URL にアクセスされたら、どの処理（関数やコントローラ）を実行するか」を決める設定のこと

    = 「URL パターン」と「処理」を結びつけるルール

### 補足 2: FastAPI におけるよく使うデコレータ一覧

- FastAPI にて定義済み関数で、API の CRUD 操作（Create, Read, Update, Delete）いずれも可能
  - `@app.get("エンドポイントのURL")`: 取得
  - `@app.post("エンドポイントのURL")`: 新規作成
  - `@app.put("エンドポイントのURL")`: 全体更新
  - `@app.patch("エンドポイントのURL")`: 部分更新
  - `@app.delete("エンドポイントのURL")`: 削除
- ここでいう`app`とは、`app = FastAPI()`（FastAPI クラスをインスタンス化したもの）。プログラムの頭で呪文のように宣言しがち

## 4. API ルータとは

- FastAPI の`APIRouter`クラスのインスタンスのこと
- API エンドポイントの集合
- 全てのエンドポイントを FastAPI クラスの`app`インスタンスに紐づけてしまうと、1 つの`main.py`ファイルにたくさんの処理を記載することになってしまい、可読性が下がる

  → API をグループ化して、グループごとに`.py`ファイルを分けることで、読みやすくなるし、メンテナンスがしやすくなる。それを叶えるのが API ルータである

- 具体例:

  例えば、main.py に書いてある以下の API を別ファイルに切り出したい場合、

  ```python
  @app.get("/v1/todos")
  def list_todos():
      return [{"id": 1, "content": "ご飯を炊く"}]
  ```

  上記部分を削除したのち、`main.py`に以下を記載し、かつ、

  ```python
  app.include_router(todos.router, prefix="/v1")
  ```

  `routers/todos.py`に以下を記載することで、

  ```python
  from fastapi import APIRouter

  router = APIRouter(prefix="/todos", tags=["todos"])

  @router.get("/")
  def list_todos():
      return [{"id": 1, "content": "ご飯を炊く"}]
  ```

  切り出すことができる。

## 5. API のバージョン管理

- エンドポイントの頭に`/v1/`や`/v2/`をつける**URL パス方式**が一般的

  ```txt
  https://api.example.com/v1/users
  https://api.example.com/v2/users
  ```

- 大規模な開発の場合は、**サブドメイン**を設けることもある

  ```txt
  https://v1.api.example.com/users
  https://v2.api.example.com/users
  ```

- バージョンで API をグループ化することが多く、その際は FastAPI の`APIRouter`クラスで可能(詳細は前述)

## 6. FastAPI と Pydantic の関係

- FastAPI は Web フレームワーク、Pydantic はデータ検証ライブラリ
- FastAPI は「自分ではデータ検証をしない」かわりに、**Pydantic モデル（BaseModel を継承したクラス）**を使ってデータを定義・検証する
- FastAPI では、Pydantic で API のインプット・アウトプットのデータ形式（スキーマ）を定義しておくことで、

  1. リクエストやレスポンスが定義に沿っているかのチェック（バリデーション）
  2. 定義に沿った型変換（例: "28" → int(28) に自動変換）

  を自動で行ってくれる
