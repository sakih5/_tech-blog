---
title: API設計の具体的なプロセス ~Todoアプリ用APIを立ててみて気づいたこと~
publishedDate: 2025-08-23
status: 初版作成完了
---

## 本記事を作成した背景

APIの設計をする際の具体的な思考プロセスやコツを整理したいと思い、本記事を作成しました。

## 本記事で取り組んだこと

- **Todo アプリ用 API**を想定して、具体的なAPI設計プロセスを言語化しました。
- 個人開発の経験から各プロセスのコツを振り返り、加筆しました。
- 成果物として、**API設計書**を作成してみました。

## 手順

### 前提

**API設計書**はMarkdown形式で記載するようにしています。

理由:

- Markdownファイルはテキストファイルであるため、**Gitで差分チェック・変更履歴管理**がしやすいためです。
- コードと同じリポジトリで一括管理できるため、**AIコーディングエージェントが参照・更新しやすい**（実装が先行して設計書の変更が追い付かないのを防げる）ためです。

### 手順1: 画面とやりたいことを洗い出す

まず最初に「この画面で、ユーザーは何を見たい？何をしたい？」と問いかけて、画面とやりたいことを洗い出します。

:::note
**なぜAPI設計をする前に画面設計**（どんな画面があって、各画面で何を表示させたいのか・どんな処理がなされるのか）**がある程度固まっている必要があるのか？**

→ **APIは画面で必要なデータをどう出すかという手段に過ぎない**から（画面イメージがAPIを決める）
:::

#### 🛠️ 具体例

想定される画面（Todoアプリの場合）

```markdown
- Todo一覧画面

  - Todoのリスト表示
  - キーワード＆カテゴリ＆締切日でフィルタ（いずれかが空欄の可能性あり）
  - Todoの追加／編集／削除

- カテゴリ管理画面

  - カテゴリのリスト表示
  - カテゴリの追加／編集／削除

- TodoのCSVエクスポートボタン

  - フィルタ条件（期間・カテゴリなど）
  - 「CSVダウンロード」ボタン
```

#### 📝 補足

画面設計のコツ: 個人開発で試行錯誤した経験上、まずは**ホーム画面**（ログイン後のメイン画面）から考えていくとスムーズに行きやすかったです。

ホーム画面の設計を行う際のポイントとして、

ホーム画面で行う処理のインプットが多い＆細かい場合には、**タブ**を作ってページを分けたり、**モーダル**（下図参照）が出てくると良い

![モーダルの例1](imgs_API設計をする/モーダルの例1.png)
![モーダルの例2](imgs_API設計をする/モーダルの例2.png)

<p align="center">Fig. モーダルの例</p>

### 手順2: それに必要な「データの形（モデル）」を決める

APIは、**モデル（データ）を操作（取得・作成・更新・削除）するための入り口**です。

**どんなデータがあるか分からないとAPIは作れない**ため、画面とやりたいことをベースに、データモデルを予め作っておきます。

#### 🛠️ 具体例

```plaintext
- Todo

  - id
  - title
  - description（任意）
  - status（todo / doing / done など）
  - due_date（締切、任意）
  - category_id（カテゴリへの外部キー）
  - created_at
  - updated_at

- Category

  - id
  - name
  - color（あれば）
  - sort_order（並び順用）
  - created_at
  - updated_at
```

### 手順3: モデルごとにリソースを分けて、基本CRUDのAPIを置く

各モデル（リソース）※に対して、
**基本的なCRUD操作**（Create / Read / Update / Delete）を網羅的にAPI化します。

※ APIは、**リソース指向設計**を基本とします。

同じリソースに対する操作は、同じパスで**HTTPメソッドを変える**ことで表現されます。

- ❌ `/getTodos`, `/createTodo`, `/updateTodo`（古い設計）
- ⭕ `GET /todos`, `POST /todos`, `PUT /todos/{id}`（モダンな設計）

#### 🛠️ 具体例

**Todoリソース**

| HTTPメソッド | パス | 処理内容 | リクエストボディ | レスポンス |
| --- | --- | --- | --- | --- |
| GET | /todos | Todo一覧取得 | なし | Todo配列 |
| GET | /todos/{id} | Todo詳細取得 | なし | Todo単体 |
| POST | /todos | Todo作成 | title, category_id, etc. | 作成したTodo |
| PUT | /todos/{id} | Todo更新 | title, status, etc. | 更新後のTodo |
| DELETE | /todos/{id} | Todo削除 | なし | 成功メッセージ |

**Categoryリソース**

| HTTPメソッド | パス | 処理内容 | リクエストボディ | レスポンス |
| --- | --- | --- | --- | --- |
| GET | /categories | カテゴリ一覧取得 | なし | Category配列 |
| GET | /categories/{id} | カテゴリ詳細取得 | なし | Category単体 |
| POST | /categories | カテゴリ作成 | name, color, etc. | 作成したCategory |
| PUT | /categories/{id} | カテゴリ更新 | name, color, etc. | 更新後のCategory |
| DELETE | /categories/{id} | カテゴリ削除 | なし | 成功メッセージ |

#### 📝 補足

- **CRUD全部用意する必要はない**

  → 画面で使わない操作（例: カテゴリの詳細画面がないなら`GET /categories/{id}`は不要）は設計しない

- HTTPメソッドの使い分け:

  - **GET**: データ取得（冪等性あり、キャッシュ可能）
  - **POST**: 新規作成（非冪等）
  - **PUT**: 全体更新（冪等性あり、全フィールド必須）
  - **PATCH**: 部分更新（冪等性あり、変更フィールドのみ送信）
  - **DELETE**: 削除（冪等性あり）

- 実際の開発では**PUTよりPATCH**が便利なケースが多い

  → 一部のフィールドだけ変更したい場合が多いため

### 手順4: 特殊な処理（CSVエクスポートなど）は「行為」としてAPIを追加する

単純なCRUD操作では表現しきれない、
**特定の処理（行為）を実行するAPI**※を追加します。

※**リソース指向の例外**として、「行為」をエンドポイントにする場合があります。

例）

- CSVエクスポート: `/todos/export`（動詞的だが許容される）
- 検索: `/todos/search`（厳密には`GET /todos?keyword=xxx`でも可）
- バッチ操作: `/todos/bulk-update`

**判断基準**: この操作は単純なCRUDで表現できるか？

- できない → 行為として切り出す
- できる → 既存のCRUD APIを使う

#### 🛠️ 具体例

**CSVエクスポート機能**

| HTTPメソッド | パス | 処理内容 | クエリパラメータ | レスポンス |
| --- | --- | --- | --- | --- |
| GET | /todos/export | TodoのCSVエクスポート | start_date, end_date, category_id | CSVファイル |

**バッチ操作**

| HTTPメソッド | パス | 処理内容 | リクエストボディ | レスポンス |
| --- | --- | --- | --- | --- |
| POST | /todos/bulk-update | 複数Todoの一括更新 | todo_ids[], status | 更新件数 |
| DELETE | /todos/bulk-delete | 複数Todoの一括削除 | todo_ids[] | 削除件数 |

**検索・フィルタリング**

| HTTPメソッド | パス | 処理内容 | クエリパラメータ | レスポンス |
| --- | --- | --- | --- | --- |
| GET | /todos/search | Todo検索 | keyword, category_id, status, due_date | Todo配列 |

#### 📝 補足

- **検索はクエリパラメータ vs 専用エンドポイント**

  - シンプルな検索: `GET /todos?keyword=xxx&category_id=1`（クエリパラメータで十分）
  - 複雑な検索: `POST /todos/search`（リクエストボディで複雑な条件を送る）

- **エクスポートはGET vs POST**

  - 軽量なエクスポート: `GET /todos/export`（クエリパラメータで条件指定）
  - 大量データ・複雑条件: `POST /todos/export`（リクエストボディで条件指定）

- **命名のコツ**: 動詞を使う場合は、処理内容が一目で分かる名前にする

  - ⭕ `/export`, `/search`, `/bulk-update`
  - ❌ `/process`, `/execute`, `/do`

### 手順5: フロントからの使われ方をイメージしつつ微調整

実装前の最終チェックとして、**フロントエンドから実際にAPIを呼び出す流れ**をシミュレーションし、使いやすさ・効率性の観点から設計を見直します。

**フロントエンドの実装パターンを考える**

1. **画面初期表示時**: どのAPIを何回呼ぶ？
2. **ユーザーアクション時**: どのAPIを呼ぶ？
3. **エラー時**: どんなエラーメッセージを表示する？

#### 🛠️ 具体例

**見直しポイント1: レスポンスに関連データを含めるか？**

- 当初の設計: `GET /todos`のレスポンスは`Todo[]`のみ

  ```json
  [
    {
      "id": 1,
      "title": "買い物",
      "category_id": 2,
      "status": "todo"
    }
  ]
  ```

- 問題点: フロントでカテゴリ名を表示するには、別途`GET /categories`を呼ぶ必要がある

- **改善案**: レスポンスにカテゴリ情報を含める

  ```json
  [
    {
      "id": 1,
      "title": "買い物",
      "category": {
        "id": 2,
        "name": "生活",
        "color": "#FF5733"
      },
      "status": "todo"
    }
  ]
  ```

**見直しポイント2: ページネーション・並び順は必要か？**

- 当初の設計: `GET /todos`は全件返す
- 問題点: データ量が増えたときにパフォーマンスが悪化
- **改善案**: クエリパラメータで制御できるようにする

  ```
  GET /todos?page=1&limit=20&sort=due_date&order=asc
  ```

**見直しポイント3: エラーレスポンスの形式を統一**

- 統一フォーマットを決めておく

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "タイトルは必須です",
      "details": {
        "field": "title"
      }
    }
  }
  ```

#### 💡 ポイント

- **N+1問題を避ける**: フロントが「一覧取得 → 各要素の詳細を個別取得」となる設計は避ける

  - ❌ `GET /todos` → 各Todoに対して`GET /categories/{id}`を呼ぶ
  - ⭕ `GET /todos`のレスポンスにカテゴリ情報を含める

- **Over-fetching vs Under-fetching**のバランス

  - Over-fetching: 不要なデータまで返してしまう（通信量増加）
  - Under-fetching: 必要なデータが足りず、追加のAPI呼び出しが必要

  → クエリパラメータで制御可能にするのが理想（例: `?include=category,tags`）

## 成果物: API設計書サンプル

上記の手順を踏まえて作成した、TodoアプリのAPI設計書の例です。

### API設計書: Todoアプリ

#### 概要

- **ベースURL**: `https://api.example.com/v1`
- **認証方式**: Bearer Token（JWT）
- **レスポンス形式**: JSON
- **文字コード**: UTF-8

---

#### 1. Todoリソース

##### 1.1 Todo一覧取得

```
GET /todos
```

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 | デフォルト値 |
| --- | --- | --- | --- | --- |
| keyword | string | × | タイトル・説明での部分一致検索 | - |
| category_id | integer | × | カテゴリIDでフィルタ | - |
| status | string | × | ステータスでフィルタ（todo/doing/done） | - |
| page | integer | × | ページ番号 | 1 |
| limit | integer | × | 1ページあたりの件数 | 20 |
| sort | string | × | ソートキー（due_date/created_at） | created_at |
| order | string | × | ソート順（asc/desc） | desc |

**レスポンス例**

```json
{
  "todos": [
    {
      "id": 1,
      "title": "買い物に行く",
      "description": "牛乳とパンを買う",
      "status": "todo",
      "due_date": "2025-12-01",
      "category": {
        "id": 2,
        "name": "生活",
        "color": "#FF5733"
      },
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-11-20T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 100,
    "limit": 20
  }
}
```

##### 1.2 Todo詳細取得

```
GET /todos/{id}
```

**パスパラメータ**

| パラメータ | 型 | 説明 |
| --- | --- | --- |
| id | integer | TodoのID |

**レスポンス例**

```json
{
  "id": 1,
  "title": "買い物に行く",
  "description": "牛乳とパンを買う",
  "status": "todo",
  "due_date": "2025-12-01",
  "category": {
    "id": 2,
    "name": "生活",
    "color": "#FF5733"
  },
  "created_at": "2025-11-20T10:00:00Z",
  "updated_at": "2025-11-20T10:00:00Z"
}
```

##### 1.3 Todo作成

```
POST /todos
```

**リクエストボディ**

```json
{
  "title": "買い物に行く",
  "description": "牛乳とパンを買う",
  "status": "todo",
  "due_date": "2025-12-01",
  "category_id": 2
}
```

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| title | string | ⭕ | Todoのタイトル（最大100文字） |
| description | string | × | 詳細説明（最大1000文字） |
| status | string | × | ステータス（デフォルト: todo） |
| due_date | string | × | 締切日（YYYY-MM-DD形式） |
| category_id | integer | ⭕ | カテゴリID |

**レスポンス例**

```json
{
  "id": 1,
  "title": "買い物に行く",
  "description": "牛乳とパンを買う",
  "status": "todo",
  "due_date": "2025-12-01",
  "category": {
    "id": 2,
    "name": "生活",
    "color": "#FF5733"
  },
  "created_at": "2025-11-20T10:00:00Z",
  "updated_at": "2025-11-20T10:00:00Z"
}
```

##### 1.4 Todo更新

```
PATCH /todos/{id}
```

**パスパラメータ**

| パラメータ | 型 | 説明 |
| --- | --- | --- |
| id | integer | TodoのID |

**リクエストボディ**

```json
{
  "title": "買い物に行く（更新）",
  "status": "doing"
}
```

※ 更新したいフィールドのみ送信

**レスポンス例**

```json
{
  "id": 1,
  "title": "買い物に行く（更新）",
  "description": "牛乳とパンを買う",
  "status": "doing",
  "due_date": "2025-12-01",
  "category": {
    "id": 2,
    "name": "生活",
    "color": "#FF5733"
  },
  "created_at": "2025-11-20T10:00:00Z",
  "updated_at": "2025-11-25T15:30:00Z"
}
```

##### 1.5 Todo削除

```
DELETE /todos/{id}
```

**パスパラメータ**

| パラメータ | 型 | 説明 |
| --- | --- | --- |
| id | integer | TodoのID |

**レスポンス例**

```json
{
  "message": "Todo deleted successfully"
}
```

##### 1.6 TodoのCSVエクスポート

```
GET /todos/export
```

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| start_date | string | × | 開始日（YYYY-MM-DD形式） |
| end_date | string | × | 終了日（YYYY-MM-DD形式） |
| category_id | integer | × | カテゴリIDでフィルタ |

**レスポンス**

CSV形式のファイル

```csv
id,title,description,status,due_date,category_name,created_at
1,買い物に行く,牛乳とパンを買う,todo,2025-12-01,生活,2025-11-20T10:00:00Z
```

---

#### 2. Categoryリソース

##### 2.1 カテゴリ一覧取得

```
GET /categories
```

**レスポンス例**

```json
{
  "categories": [
    {
      "id": 1,
      "name": "仕事",
      "color": "#3498DB",
      "sort_order": 1,
      "created_at": "2025-11-01T09:00:00Z",
      "updated_at": "2025-11-01T09:00:00Z"
    },
    {
      "id": 2,
      "name": "生活",
      "color": "#FF5733",
      "sort_order": 2,
      "created_at": "2025-11-01T09:00:00Z",
      "updated_at": "2025-11-01T09:00:00Z"
    }
  ]
}
```

##### 2.2 カテゴリ作成

```
POST /categories
```

**リクエストボディ**

```json
{
  "name": "趣味",
  "color": "#2ECC71",
  "sort_order": 3
}
```

**レスポンス例**

```json
{
  "id": 3,
  "name": "趣味",
  "color": "#2ECC71",
  "sort_order": 3,
  "created_at": "2025-11-25T16:00:00Z",
  "updated_at": "2025-11-25T16:00:00Z"
}
```

##### 2.3 カテゴリ更新

```
PATCH /categories/{id}
```

**リクエストボディ**

```json
{
  "name": "趣味（更新）",
  "color": "#27AE60"
}
```

##### 2.4 カテゴリ削除

```
DELETE /categories/{id}
```

※ カテゴリに紐づくTodoが存在する場合は削除不可（エラーを返す）

---

#### 3. エラーレスポンス

すべてのエラーは以下の形式で返されます。

**バリデーションエラー（400 Bad Request）**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": {
      "title": ["タイトルは必須です"],
      "category_id": ["存在しないカテゴリIDです"]
    }
  }
}
```

**認証エラー（401 Unauthorized）**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

**リソース未検出（404 Not Found）**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "指定されたTodoが見つかりません"
  }
}
```

**サーバーエラー（500 Internal Server Error）**

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "サーバーでエラーが発生しました"
  }
}
```

---

## まとめ

API設計は「**画面から逆算して、必要なデータ操作を整理する**」プロセスです。

### API設計の5ステップ

1. **画面とやりたいことを洗い出す** → 何が必要か明確にする
2. **データの形（モデル）を決める** → APIの操作対象を定義
3. **基本CRUDのAPIを置く** → リソース指向で設計
4. **特殊な処理を追加する** → CRUD以外の行為を切り出す
5. **フロントからの使われ方で微調整** → 実用性を高める

### 設計時の重要ポイント

- **リソース指向**を基本にしつつ、柔軟に「行為」も許容する
- **N+1問題を避ける**ためにレスポンス設計を工夫する
- **エラーレスポンスを統一**してフロントの実装を楽にする
- **YAGNI原則**を守り、必要なAPIだけを設計する

## 学び・次に活かせる知見

- 画面 → データ → APIの順に設計できるということ
- APIはリソースでグルーピングするのが原則だということ

## 参考文献

- Arnaud Lauret（著）, クイープ（監訳）. 『Web APIの設計』 翔泳社, 2020.
  <https://www.amazon.co.jp/dp/B08CK2H12H>
