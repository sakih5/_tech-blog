import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/content/docs ディレクトリを再帰的に探索
function findMarkdownFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// 画像パスを修正
function fixImagePaths(content) {
  // バックスラッシュをスラッシュに変更
  let fixed = content.replace(/imgs\\/g, 'imgs/');

  // Markdownの画像記法を探して、相対パスに変換
  // ![alt](imgs/image.png) → ![alt](../../assets/imgs_xxx/image.png)
  // ![alt](imgs_xxx/image.png) → ![alt](../../assets/imgs_xxx/image.png)

  // ディレクトリの深さに応じて相対パスを調整
  // 02_backend/*.md の場合: ../../assets/
  // 07_udemy/xxx/*.md の場合: ../../../assets/

  return fixed;
}

// メイン処理
const docsDir = path.join(__dirname, '..', 'src', 'content', 'docs');
const files = findMarkdownFiles(docsDir);

let processedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const originalContent = content;

  // バックスラッシュをスラッシュに変更
  if (content.includes('imgs\\')) {
    content = content.replace(/imgs\\/g, 'imgs/');
  }

  // 画像パスを相対パスに変換
  // ファイルの深さを計算
  const relativePath = path.relative(docsDir, file);
  const depth = relativePath.split(path.sep).length - 1;
  const prefix = '../'.repeat(depth + 1) + 'assets/';

  // ファイル名から対応する画像ディレクトリを推測
  const fileName = path.basename(file, '.md');
  const expectedImgDir = `imgs_${fileName}`;

  // ![...](imgs/xxx.png) または ![...](imgs_xxx/yyy.png) のパターンをマッチ
  content = content.replace(/!\[(.*?)\]\((imgs[^)]+)\)/g, (match, alt, imgPath) => {
    // パスを正規化（スラッシュに統一）
    let normalizedPath = imgPath.replace(/\\/g, '/');

    // imgs/ で始まる場合は、対応する imgs_xxx/ に置き換える
    if (normalizedPath.startsWith('imgs/')) {
      normalizedPath = normalizedPath.replace('imgs/', `${expectedImgDir}/`);
    }

    return `![${alt}](${prefix}${normalizedPath})`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`✅ Fixed: ${path.relative(docsDir, file)}`);
    processedCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Processed: ${processedCount} files`);
console.log(`  Total: ${files.length} files`);
