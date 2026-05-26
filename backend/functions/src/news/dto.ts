import { z } from "zod";

export const newsArticleSchema = z.object({
  article_id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  link: z.string(),
  source_name: z.string().optional(),
  source_id: z.string().nullable().optional(),
  pubDate: z.string(),
  category: z.array(z.string()).optional(),
  language: z.string().optional(),
  country: z.array(z.string()).optional(),
});

export type NewsArticle = z.infer<typeof newsArticleSchema>;

export const newsDataResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number().optional(),
  results: z.array(z.unknown()).nullish(),
  nextPage: z.string().nullable().optional(),
});

export type NewsDataResponse = z.infer<typeof newsDataResponseSchema>;
