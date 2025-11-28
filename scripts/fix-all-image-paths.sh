#!/bin/bash

# すべてのMarkdownファイルを検索して、画像パスを修正
cd /home/sakih/projects/_articles

# src/content/docs 内のすべてのMarkdownファイルを処理
find src/content/docs -name "*.md" -type f | while read -r file; do
  # ファイル名（拡張子なし）を取得
  filename=$(basename "$file" .md)

  # 対応する画像ディレクトリを探す
  imgdir="imgs_${filename}"

  # 画像ディレクトリが存在するか確認
  if [ -d "src/assets/${imgdir}" ]; then
    # imgs/ を imgs_xxx/ に置き換え
    sed -i "s|../../assets/imgs/|../../assets/${imgdir}/|g" "$file"
    sed -i "s|../../../assets/imgs/|../../../assets/${imgdir}/|g" "$file"
    echo "✅ Fixed: $file -> $imgdir"
  fi
done

echo "Done!"
