import type { APIContext } from "astro";

export function GET({ site }: APIContext) {
  const preview =
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "development";
  // Allow crawling so search engines can read the preview pages' noindex tags.
  return new Response(
    `User-agent: *\nAllow: /\n${preview ? "" : `Sitemap: ${new URL("/sitemap.xml", site).href}\n`}`,
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}
