import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://sakih.github.io',
  base: '/_tech-blog',
  integrations: [
    starlight({
      title: '技術記事アーカイブ',
      description: '個人開発・技術学習の記録を集約した技術ブログ',

      // ファビコン設定
      favicon: '/favicon.svg',

      // 日本語設定
      defaultLocale: 'root',
      locales: {
        root: {
          label: '日本語',
          lang: 'ja',
        },
      },

      // ソーシャルリンク
      social: {
        github: 'https://github.com/sakih/_tech-blog',
      },

      // ヘッダーナビゲーション（タブ）を追加
      head: [
        {
          tag: 'style',
          content: `
            .sl-nav-link { display: inline-block; }
          `
        }
      ],

      // サイドバーナビゲーション
      sidebar: [
        {
          label: 'ホーム',
          link: '/',
        },
        {
          label: 'カテゴリ',
          collapsed: false,
          items: [
            {
              label: 'フロントエンド',
              collapsed: true,
              autogenerate: { directory: '01_frontend' },
            },
            {
              label: 'バックエンド',
              collapsed: true,
              autogenerate: { directory: '02_backend' },
            },
            {
              label: 'インフラ・環境構築',
              collapsed: true,
              autogenerate: { directory: '03_infrastructure' },
            },
            {
              label: 'Webアプリケーション',
              collapsed: true,
              autogenerate: { directory: '04_webapps' },
            },
            {
              label: 'ツール・設定',
              collapsed: true,
              autogenerate: { directory: '05_tools' },
            },
            {
              label: 'Udemy講座まとめ',
              collapsed: true,
              autogenerate: { directory: '07_udemy' },
            },
            {
              label: 'AWS資格',
              collapsed: true,
              autogenerate: { directory: '08_aws_credentials' },
            },
            {
              label: 'ケーススタディ',
              collapsed: true,
              autogenerate: { directory: '09_case_studys' },
            },
          ],
        },
        {
          label: 'About',
          link: '/about',
        },
      ],

      // カスタムCSS
      customCss: [
        './src/styles/custom.css',
      ],

      // 編集リンクを無効化
      editLink: {
        baseUrl: 'https://github.com/sakih/_articles/edit/main/',
      },

      // 最終更新日を表示
      lastUpdated: true,

      // ページ下部のナビゲーション
      pagination: true,

      // 目次の深さ
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },

      // フッター
      credits: false,
    }),
  ],
});
