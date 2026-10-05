import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    category: z.enum(["site", "engineering"]),
    dateLabel: z.string().optional(),
    order: z.number().default(0),
    legacy: z.boolean().default(false),
    sourceNote: z.string().optional(),
  }),
});

export const collections = { blog };
