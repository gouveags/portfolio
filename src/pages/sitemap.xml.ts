import { getCollection } from 'astro:content';
import { apps } from '../data/navigation';
export async function GET() {
  const posts = await getCollection('blog');
  const paths = [...apps.map(app => app.path), '/credits/', ...posts.map(post => `/blog/${post.id}/`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>https://gouveagsportfolio.vercel.app${path}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
