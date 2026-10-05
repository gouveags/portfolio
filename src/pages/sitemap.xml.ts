import { getCollection } from 'astro:content';
import { apps } from '../data/navigation';
import type { APIContext } from 'astro';
export async function GET({ site }: APIContext) {
  const preview = process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development';
  const posts = await getCollection('blog');
  const paths = preview ? [] : [...new Set([...apps.map(app => app.path), '/credits/', ...posts.map(post => `/blog/${post.id}/`)])];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${new URL(path, site).href}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
