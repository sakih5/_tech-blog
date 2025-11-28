---
title: FastAPIで出てくるUvicornとは何ぞや
---

FastAPIを使うときに出てくる、Uvicornって何者？

ASGIサーバー？なぜFastAPIはサーバーと組み合わせないと使えないの？と思ったので、調べてみました。

FastAPI = アプリ
Uvicorn = 実行エンジン

そもそもNginxって何者？

ReactもNginxと組み合わせないと使えないってこと？

PostgreSQLはサーバと組み合わせと使えない？そしたらその時のサーバって何？

SQLってTCPなの？HTTP通信じゃないの？

アプリケーションサーバとDBサーバはL4で通信をし合っているってこと？
