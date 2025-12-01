import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro:content';

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      extend: z.object({
        publishedDate: z.date().optional(),
        status: z.enum(['作成中', '初版作成完了', '改訂版作成完了']).optional(),
      }),
    }),
  }),
};
