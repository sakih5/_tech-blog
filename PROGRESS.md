# PROGRESS

## 記事ネタ候補一覧

- Dockerfile 作成アンチパターン

  - やってはいけない Dockerfile

    FROM ubuntu:latest を使う
    → 出来るだけ alpine などの軽量イメージを使う

    .dockerignore を使わない
    → 不要なファイルを除外し、ビルド時間を短縮

    RUN を何行も重ねる
    → &&で RUN をまとめ、レイヤー数を減らす

    重い Docker イメージは辞書を 5 冊持ち歩く様なもの

- Alembic×SQLAlchemy でデータベースの変更履歴管理を行う

- Pydantic を使ったバックエンドサーバ側でのバリデーションの方法

- uv とは

- デプロイ後の開発の在り方
