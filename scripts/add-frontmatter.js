import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// organized_articles ディレクトリを再帰的に探索
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

// ファイル名からタイトルを抽出
function extractTitle(filename) {
  // ファイル名から拡張子を削除
  const nameWithoutExt = path.basename(filename, '.md');

  // 日付部分（YYMMDD_）を削除
  const titlePart = nameWithoutExt.replace(/^\d{6}_/, '');

  // index.md の場合は親ディレクトリ名を使用
  if (nameWithoutExt === 'index') {
    const parentDir = path.basename(path.dirname(filename));
    // ディレクトリ名の番号部分を削除（例: 01_frontend → frontend）
    return parentDir.replace(/^\d+_/, '');
  }

  return titlePart;
}

// frontmatterがあるかチェック
function hasFrontmatter(content) {
  return content.trim().startsWith('---');
}

// frontmatterを追加
function addFrontmatter(content, title) {
  const frontmatter = `---
title: ${title}
---

`;
  return frontmatter + content;
}

// メイン処理
const docsDir = path.join(__dirname, '..', 'organized_articles');
const files = findMarkdownFiles(docsDir);

let processedCount = 0;
let skippedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');

  if (hasFrontmatter(content)) {
    console.log(`⏩ Skipped (already has frontmatter): ${path.relative(docsDir, file)}`);
    skippedCount++;
    continue;
  }

  const title = extractTitle(file);
  const newContent = addFrontmatter(content, title);

  fs.writeFileSync(file, newContent, 'utf-8');
  console.log(`✅ Added frontmatter to: ${path.relative(docsDir, file)} (title: ${title})`);
  processedCount++;
}

console.log(`\n📊 Summary:`);
console.log(`  Processed: ${processedCount} files`);
console.log(`  Skipped: ${skippedCount} files`);
console.log(`  Total: ${files.length} files`);
