---
title: ReazonSpeechでスマホ録音のTeams会議（AAC）をWSL2上で文字起こしするまで
publishedDate: 2025-11-28
---

# ReazonSpeechでスマホ録音のTeams会議（AAC）をWSL2上で文字起こしするまで

## 記事概要

| 項目 | 内容 |
| ---- | ---- |
| 検証環境 | Windows 11 + WSL2 (Ubuntu 24.04) |
| 目的 | スマホで録音したオンライン会議のPC音声 + 肉声（AAC形式）を、WSL2上のReazonSpeechで安全に文字起こしできる環境とバッチ処理フローを構築する |

---

## 本記事を作成した背景

オンライン会議の内容を後から振り返る機会が増えたため、会議を録音しておき、必要な部分だけ文字起こしして読み返したいと考えました。
ただし、クラウドAPIに会議音声をそのまま送ることにはプライバシー面の不安があります。

そこで、本記事では **手元のWSL2環境だけで完結する文字起こしパイプライン** を作る過程をまとめました。

最初はDockerイメージを使ってReazonSpeechを動かそうとしましたが、コンテナイメージの取得でつまずいたり、長時間音声を一気に処理しようとしてWSLごと固まってしまったりと、いくつか試行錯誤がありました。
最終的には、**pyenv + venvでのローカル環境構築 + ffmpegでの音声分割 + ReazonSpeech(k2-asr)によるバッチ文字起こし** という形に落ち着いています。

---

## 本記事で取り組んだこと

- **オンライン会議の録音ファイル（AAC）をWSL2に持ち込み、WAV変換 → 文字起こし** できるようにした
- ReazonSpeech を **Dockerではなく venv + pyenv 上で動かす** 形に切り替えた
- **29分43秒の会議音声を30秒ごとに自動分割し、チャンクごとに文字起こしして1本のテキストに結合** するバッチスクリプトを作成した
- 長時間音声で発生しうる **メモリ問題・警告メッセージ** も確認しながら、安全な運用の仕方を整理した

---

## 手順

### 前提

- **環境**
  - Windows 11
  - WSL2: Ubuntu 24.04
- **前提知識**
  - Linuxの基本コマンド（`cd`, `ls`, `mkdir` など）がわかる
  - Pythonで何かしらプログラムを作ったことがある
- **前提状態**
  - WSL2上に **pyenv** が導入済み
  - `git` と `ffmpeg` がインストール済み（記事内でもコマンドを再掲します）

> もともとは Docker で試しましたが、
>
> - GHCRのイメージ取得に失敗（403 Forbidden）
> - コンテナ内での入出力が少し煩雑
> と感じたため、最終的に **venvで完結させる構成** に落ち着いています。

---

### 1. プロジェクト構成とPython仮想環境（venv）の準備

#### 🎯 目的

- 後から見返しやすいように、**ディレクトリ構成を整理したプロジェクト** を作る
- ReazonSpeechを入れるための **Python仮想環境（venv）** を用意する

#### 🛠️ 手順詳細

まず、プロジェクト用のディレクトリを作成します。

```bash
# プロジェクトルートへ移動
cd ~/projects

# プロジェクト作成
mkdir -p AI-study_transcribe-automation
cd AI-study_transcribe-automation
```

ディレクトリ構成（途中の時点）はこんなイメージです。

```bash
tree -L 1
```

```plaintext
.
├── raw-voice   # 録音ファイル（AACなど）を置く
├── wav         # AAC→WAV変換後のファイル
├── txt         # 文字起こし済みテキスト
└── (このあとReazonSpeech, スクリプトなどが増えていく)
```

Pythonのバージョンをpyenvで指定します（例として 3.11.9）：

```bash
pyenv install 3.11.9 --skip-existing
pyenv local 3.11.9

python -V  # Python 3.11.x であればOK
```

次に、venvを作成して有効化します。

```bash
# venv作成
python -m venv .venv

# 有効化
source .venv/bin/activate

# venv上のPythonで動いているか確認
python -V
```

ReazonSpeechのインストールに必要な `git` と `ffmpeg` を確認／インストールします。

```bash
sudo apt update
sudo apt install -y git ffmpeg
```

続いて、ReazonSpeechをクローンして `k2-asr` パッケージをインストールします。

```bash
cd ~/projects/AI-study_transcribe-automation

git clone https://github.com/reazon-research/ReazonSpeech

# venvが有効な状態で実行
pip install ./ReazonSpeech/pkg/k2-asr
```

#### 💡 理解ポイント

- **pyenv + venv** で環境を分離しておくことで、他プロジェクトへの影響を最小限にできます。
- ReazonSpeechは `pip install reazonspeech` 的な単一パッケージではなく、GitHubリポジトリの中の `pkg/k2-asr` をインストールする構成になっています。
- `ffmpeg` は音声変換の要。**AAC→WAV変換** や **長時間音声の分割** でフル活用します。

#### 📝 補足

- 途中までは Dockerイメージ `ghcr.io/reazon-research/reazonspeech:latest` をベースにする方法を試しましたが、`403 Forbidden` でPullできず、素直にローカル環境構築に切り替えました。
- 今回は CPU で動かしています。GPU がある環境では `load_model(device="cuda")` のように変更可能です。

---

### 2. AAC を WAV に変換し、20秒のテスト文字起こしを行う

#### 🎯 目的

- スマホで録音した **AACファイルをWAVに変換** できることを検証する
- 短い音声（20秒）で、ReazonSpeechの文字起こしが **一通り動くことを確認** する

#### 🛠️ 手順詳細

まず、スマホから取得したTeams会議の録音ファイル（AAC）を `raw-voice/` に配置しました。

例：

```plaintext
raw-voice/2025-11-27-teams-meeting.aac
```

これを、先頭20秒だけ切り出してWAVに変換します。

```bash
cd ~/projects/AI-study_transcribe-automation

ffmpeg -i raw-voice/2025-11-27-teams-meeting.aac   -ss 0 -t 20   -ar 16000 -ac 1   wav/test-20s.wav
```

<details>
<summary>ffmpeg出力ログ（抜粋）</summary>

```plaintext
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'raw-voice/2025-11-27-teams-meeting.aac':
  Duration: 00:29:43.65, start: 0.000000, bitrate: 49 kb/s
  Stream #0:0[0x3](eng): Audio: aac (HE-AAC), 48000 Hz, stereo, fltp, 48 kb/s
...
Output #0, wav, to 'wav/test-20s.wav':
  Stream #0:0(eng): Audio: pcm_s16le, 16000 Hz, mono, s16, 256 kb/s (default)
...
size=     625kB time=00:00:19.96 bitrate= 256.5kbits/s speed=51.6x
```

</details>

次に、シンプルな単発文字起こしスクリプト `transcribe.py` を作成します。

```bash
cd ~/projects/AI-study_transcribe-automation
```

`transcribe.py`：

```python
from pathlib import Path
from reazonspeech.k2.asr import load_model, transcribe, audio_from_path


def main() -> None:
    audio_path = Path("wav/test-20s.wav")
    output_path = Path("txt/test-20s.txt")

    print("[INFO] モデル読み込み中…（初回はダウンロードで時間がかかります）")
    model = load_model(device="cpu")

    print(f"[INFO] 音声読み込み中… {audio_path}")
    audio = audio_from_path(str(audio_path))

    print("[INFO] 文字起こし中…")
    result = transcribe(model, audio)

    print(f"[INFO] テキストを書き出し中… {output_path}")
    output_path.write_text(result.text, encoding="utf-8")

    print("[INFO] 完了しました！")


if __name__ == "__main__":
    main()
```

実行：

```bash
source .venv/bin/activate
python transcribe.py
```

<details>
<summary>実行ログ</summary>

```plaintext
[INFO] モデル読み込み中…（初回はダウンロードで時間がかかります）
[INFO] 音声読み込み中… wav/test-20s.wav
[INFO] 文字起こし中…
[INFO] テキストを書き出し中… /home/sakih/projects/AI-study_transcribe-automation/txt/test-20s.txt
[INFO] 完了しました！
```

</details>

`txt/test-20s.txt` に、日本語の文字起こし結果が出力されていればOKです。

#### 💡 理解ポイント

- 最初の `load_model()` は、モデルをダウンロード＆メモリにロードするため、**初回だけかなり時間がかかる** 場合があります。
- `audio_from_path()` と `transcribe()` は、ReazonSpeechの基本的な処理の流れです。
  ここを一度経験しておくと、この後のバッチ処理も理解しやすくなります。
- 20秒程度の短い音声で成功したことで、
  **「インストール〜最小実行まで」は正しくできている** と確認できました。

#### 📝 補足

- AAC録音が約30分あったため、全部を一気に `transcribe()` に渡すのは危険（メモリ使用量が跳ね上がる）と感じ、まずは短い切り出しで試しています。

---

### 3. 29分43秒の会議録音を30秒チャンクに分割して一括文字起こしする

#### 🎯 目的

- 約30分の会議録音をそのまま `transcribe()` に渡すとメモリ負荷が大きくなるため、
  **ffmpegで30秒ごとに分割し、チャンク単位で安全に文字起こしするパイプライン** を作る。
- タイムスタンプ付きで1つのテキストファイルにまとめ、**後からどの時間帯の発言か追いやすくする**。

#### 🛠️ 手順詳細

まず、AAC全体をWAVに変換しておきます（すでに実施済みであれば省略可）。

```bash
cd ~/projects/AI-study_transcribe-automation

ffmpeg -i raw-voice/2025-11-27-teams-meeting.aac   -ar 16000 -ac 1   wav/2025-11-27-teams-meeting.wav
```

次に、WAVを30秒ごとに分割するための `chunks/` ディレクトリを作ります。

```bash
mkdir -p chunks
```

手動での分割コマンドは以下の通りです（後でスクリプトの中でも利用します）。

```bash
ffmpeg -i wav/2025-11-27-teams-meeting.wav   -f segment -segment_time 30   -ar 16000 -ac 1   chunks/chunk_%03d.wav
```

<details>
<summary>分割時のログ（抜粋）</summary>

```bash
Input #0, wav, from 'wav/2025-11-27-teams-meeting.wav':
  Duration: 00:29:43.64, bitrate: 256 kb/s
...
[segment @ ...] Opening 'chunks/chunk_000.wav' for writing
[segment @ ...] Opening 'chunks/chunk_001.wav' for writing
...
[segment @ ...] Opening 'chunks/chunk_059.wav' for writing
[out#0/segment @ ...] video:0kB audio:55739kB ...
size=N/A time=00:29:43.55 bitrate=N/A speed= 406x
```

</details>

29分43秒を30秒ごとに切ると、**約60チャンク** に分割されます。

---

ここからは、分割〜文字起こし〜結合までを自動で行うスクリプト `batch_transcribe.py` を作成します。

```bash
cd ~/projects/AI-study_transcribe-automation
```

`batch_transcribe.py`：

```python
import sys
import subprocess
from pathlib import Path
from datetime import timedelta

from reazonspeech.k2.asr import load_model, transcribe, audio_from_path

CHUNK_SECONDS = 30


def ffmpeg_split(input_wav: Path, chunks_dir: Path) -> None:
    """ffmpeg で長い wav を CHUNK_SECONDS ごとに分割する"""
    chunks_dir.mkdir(exist_ok=True)

    # 以前のチャンクが残っていたら削除
    for old in chunks_dir.glob("chunk_*.wav"):
        old.unlink()

    cmd = [
        "ffmpeg",
        "-i",
        str(input_wav),
        "-f",
        "segment",
        "-segment_time",
        str(CHUNK_SECONDS),
        "-ar",
        "16000",
        "-ac",
        "1",
        str(chunks_dir / "chunk_%03d.wav"),
    ]
    print("[INFO] ffmpeg でチャンクに分割中...")
    subprocess.run(cmd, check=True)
    print("[INFO] 分割完了しました。")


def format_time(seconds: int) -> str:
    """秒数を 00:00:00 形式に整形"""
    return str(timedelta(seconds=seconds))


def main() -> None:
    if len(sys.argv) < 2:
        print("使い方: python batch_transcribe.py wav/長いファイル.wav")
        sys.exit(1)

    project_root = Path(__file__).resolve().parent
    input_path = Path(sys.argv[1])

    if not input_path.exists():
        print(f"[ERROR] 入力ファイルが見つかりません: {input_path}")
        sys.exit(1)

    chunks_dir = project_root / "chunks"
    txt_dir = project_root / "txt"
    txt_dir.mkdir(exist_ok=True)

    output_path = txt_dir / (input_path.stem + "_chunked.txt")

    # ① ffmpeg でチャンクに分割
    ffmpeg_split(input_path, chunks_dir)

    # ② モデルを1回だけロード
    print("[INFO] モデル読み込み中…（初回はダウンロードで時間がかかります）")
    model = load_model(device="cpu")

    # ③ チャンクを順番に処理
    chunk_files = sorted(chunks_dir.glob("chunk_*.wav"))
    if not chunk_files:
        print("[ERROR] チャンクファイルが見つかりません。ffmpeg の分割に失敗したかも？")
        sys.exit(1)

    print(f"[INFO] チャンク数: {len(chunk_files)}")
    lines: list[str] = []

    for idx, chunk in enumerate(chunk_files):
        start_sec = idx * CHUNK_SECONDS
        end_sec = (idx + 1) * CHUNK_SECONDS
        time_range = f"[{format_time(start_sec)} - {format_time(end_sec)}]"

        print(f"[INFO] {time_range} を文字起こし中… {chunk.name}")

        audio = audio_from_path(str(chunk))
        result = transcribe(model, audio)

        lines.append(time_range)
        lines.append(result.text)
        lines.append("")  # 空行で区切り

    print(f"[INFO] 出力ファイルに書き出し中… {output_path}")
    output_path.write_text("\n".join(lines), encoding="utf-8")

    print("[INFO] 完了しました！")


if __name__ == "__main__":
    main()
```

実行コマンド：

```bash
source .venv/bin/activate

python batch_transcribe.py wav/2025-11-27-teams-meeting.wav
```

<details>
<summary>実行ログ（抜粋）</summary>

```bash
[INFO] ffmpeg でチャンクに分割中...
...
[INFO] 分割完了しました。
[INFO] モデル読み込み中…（初回はダウンロードで時間がかかります）
[INFO] チャンク数: 60
[INFO] [0:00:00 - 0:00:30] を文字起こし中… chunk_000.wav
/home/.../transcribe.py:29: UserWarning: Passing a long audio input (31.9s) is not recommended ...
[INFO] [0:00:30 - 0:01:00] を文字起こし中… chunk_001.wav
...
[INFO] [0:29:30 - 0:30:00] を文字起こし中… chunk_059.wav
[INFO] 出力ファイルに書き出し中… /home/sakih/projects/AI-study_transcribe-automation/txt/2025-11-27-teams-meeting_chunked.txt
[INFO] 完了しました！
```

</details>

実行が終わると、`txt/2025-11-27-teams-meeting_chunked.txt` が生成されます。
中身は次のように **時間帯ごとにテキストが並んだ形式** になります。

```plaintext
[0:00:00 - 0:00:30]
（最初の30秒分の文字起こし）

[0:00:30 - 0:01:00]
（次の30秒分の文字起こし）

...
```

#### 💡 理解ポイント

- 一気に 29分43秒 を投げるのではなく、**30秒ごとに分割してモデルに渡している** ため、WSLやVS Codeが固まるリスクがかなり減ります。
- K2側からは「30秒超の入力はメモリ的におすすめしない」というWarningが出ていますが、今回はギリギリ30秒前後なので許容範囲かな、という判断です（気になる場合は `CHUNK_SECONDS = 20` などに縮めるとより安全です）。
- モデルのロードは1回だけにし、60チャンクをループ処理しているため、**モデルDL & ロードのコストを最小化** できています。

#### 📝 補足

- 最初に長時間音声をそのまま `transcribe()` しようとした際は、WSLごと固まり、VS Codeからもリモートが切れる状態になりました。
  → `wsl --shutdown` で一度WSLを落としてから再起動することで復旧しました。
- その経験から、「長時間音声は必ずチャンクに分割する」「モデルには短い音声だけ渡す」という運用ルールにしています。

---

## 学び・次に活かせる知見

- **長時間音声はそのまま音声認識エンジンに投げないほうが安全**
  → ffmpegでの分割や、ライブラリ側の推奨長さを意識するとトラブルが減ると実感しました。
- Dockerとvenvの両方を試した結果、
  → 「一人で試すPoCレベルなら、venvのほうが理解負荷が低く、デバッグもしやすい」
  という感触を得ました。
- ReazonSpeechの `k2-asr` は、日本語音声に強く、ローカル完結で動くため、
  **会議や面談などプライバシー性の高い音声処理に向いている** と再確認できました。
- 今回は「単純な文字起こし」まででしたが、
  今後は **要約・アクションアイテム抽出** など、上流のNLP処理と組み合わせていきたいと思いました。

---

## 参考文献

1. ReazonSpeech GitHub リポジトリ
   - <https://github.com/reazon-research/ReazonSpeech>
2. ReazonSpeech k2-asr README（インストール手順・APIの使い方）
3. FFmpeg Documentation – Audio Resampling, Format Conversion, and Segmenting
4. k2 / icefall Issue: Long audio and memory usage に関する議論（UserWarningの元ネタ）

---

<!-- 以下は執筆者用メモ（公開時に削除） -->
## もし時間があれば…Todo

- 処理フローの図（「AAC → WAV → 分割 → transcribe → テキスト結合」）を追加する
- CHUNK_SECONDS を変えた場合の精度・速度・メモリ比較を別記事化する
- 文字起こし結果を Markdown 形式で整理するスクリプトを追加する

## 更新履歴

- 2025-11-27：初版公開（AAC録音→WAV変換→30秒チャンク分割→バッチ文字起こしまで）
