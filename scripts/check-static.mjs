import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const origin = 'https://gouveagsportfolio.vercel.app';
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const expectedRoutes = [
  '/', '/about/', '/projects/', '/open-source/', '/blog/', '/contact/', '/guide/', '/credits/',
  '/blog/why-this-desktop/', '/blog/vision-design-and-tech-choices/',
  '/blog/the-field-i-almost-threw-away/', '/blog/let-the-agent-see-what-broke/',
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const decode = (value) => value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
  const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
  if (entity[1] !== '#') return named[entity.toLowerCase()] || entity;
  return String.fromCodePoint(entity[2].toLowerCase() === 'x'
    ? Number.parseInt(entity.slice(3, -1), 16) : Number.parseInt(entity.slice(2, -1), 10));
});
// Parse generated start tags, skipping comments and raw script/style contents.
// This does not execute a page or depend on a transitive HTML-parser package.
function tags(html) {
  const source = html.replace(/<!--[\s\S]*?-->/g, '').replace(/(<(?:script|style)\b[^>]*>)[\s\S]*?(<\/(?:script|style)>)/gi, '$1$2');
  return [...source.matchAll(/<([a-z][\w:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)].map((match) => {
    const attrs = {};
    for (const attribute of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[attribute[1].toLowerCase()] = decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
    }
    return { name: match[1].toLowerCase(), attrs };
  });
}
let files;
try { files = await walk(root); } catch {
  console.error('No production build found. Run npm run build before npm run test:static.');
  process.exit(1);
}
const pages = new Map();
for (const filename of files.filter((file) => file.endsWith('.html'))) {
  const relative = path.relative(root, filename).split(path.sep).join('/');
  const route = `/${relative.replace(/index\.html$/, '')}`;
  const html = await readFile(filename, 'utf8');
  const elements = tags(html);
  const ids = elements.filter((tag) => tag.attrs.id).map((tag) => tag.attrs.id);
  check(new Set(ids).size === ids.length, `${route}: duplicate HTML IDs`);
  pages.set(route, { filename, html, elements, ids: new Set(ids) });
}
check(pages.size >= 10, `Expected at least 10 static HTML routes, found ${pages.size}`);
for (const route of expectedRoutes) check(pages.has(route), `Missing required route: ${route}`);
const titles = new Set();
let internalLinks = 0;
let assets = 0;
async function targetExists(url, context, requireFragment = true) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { failures.push(`${context}: invalid URL encoding`); return; }
  const target = path.resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) { failures.push(`${context}: path escapes build`); return; }
  let exists = false;
  try {
    const info = await stat(target);
    exists = info.isFile() || (info.isDirectory() && (await stat(path.join(target, 'index.html'))).isFile());
  } catch { /* Report all broken references in one run. */ }
  check(exists, `${context}: missing ${url.pathname}`);
  if (exists && requireFragment && url.hash) {
    const route = pathname.endsWith('/') ? pathname : `${pathname.replace(/\/index\.html$/, '')}/`;
    const page = pages.get(route);
    let fragment;
    try { fragment = decodeURIComponent(url.hash.slice(1)); } catch { fragment = url.hash.slice(1); }
    if (page) check(page.ids.has(fragment), `${context}: missing fragment ${url.pathname}${url.hash}`);
  }
}
for (const [route, page] of pages) {
  const { html, elements } = page;
  const meta = (name, attribute = 'name') => elements.find((tag) => tag.name === 'meta' && tag.attrs[attribute] === name)?.attrs.content;
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
  check(title.length > 8, `${route}: missing/descriptive title`);
  check(!titles.has(title), `${route}: duplicate document title`); titles.add(title);
  check(Boolean(meta('description')?.trim()), `${route}: missing description`);
  check(meta('viewport')?.includes('width=device-width'), `${route}: missing responsive viewport`);
  check(elements.some((tag) => tag.name === 'html' && tag.attrs.lang === 'en'), `${route}: missing document language`);
  check(elements.some((tag) => tag.name === 'main' && tag.attrs.id === 'main-content'), `${route}: missing main landmark`);
  check(elements.some((tag) => tag.name === 'h1'), `${route}: missing server-rendered heading`);
  check(elements.some((tag) => tag.attrs['data-path'] === route), `${route}: shell path differs from route`);
  const canonical = elements.filter((tag) => tag.name === 'link' && tag.attrs.rel === 'canonical');
  check(canonical.length === 1 && canonical[0].attrs.href === `${origin}${route}`, `${route}: incorrect canonical URL`);
  check(meta('og:url', 'property') === `${origin}${route}`, `${route}: incorrect Open Graph URL`);
  check(meta('og:title', 'property') === title, `${route}: Open Graph title differs`);
  check(Boolean(meta('og:description', 'property')), `${route}: missing Open Graph description`);
  check(meta('og:type', 'property') === (route.startsWith('/blog/') && route !== '/blog/' ? 'article' : 'website'), `${route}: wrong Open Graph type`);
  check(meta('twitter:card') === 'summary', `${route}: missing Twitter card`);
  const ogImage = meta('og:image', 'property');
  if (ogImage) await targetExists(new URL(ogImage, origin), `${route} Open Graph image`, false);

  for (const { name, attrs } of elements) {
    if (name === 'a') {
      check(Object.hasOwn(attrs, 'href') && Boolean(attrs.href.trim()), `${route}: anchor has no destination`);
      const href = attrs.href || '';
      check(href !== '#' && !/^\s*(?:javascript|vbscript):/i.test(href), `${route}: fake link ${href}`);
      if (attrs.target === '_blank') check((attrs.rel || '').split(/\s+/).includes('noopener'), `${route}: new-tab link lacks noopener: ${href}`);
    }
    const references = [];
    if (attrs.href) references.push({ value: attrs.href, asset: name !== 'a' });
    if (attrs.src) references.push({ value: attrs.src, asset: true });
    if (attrs.poster) references.push({ value: attrs.poster, asset: true });
    if (attrs.srcset) for (const source of attrs.srcset.split(',')) references.push({ value: source.trim().split(/\s+/)[0], asset: true });
    for (const reference of references) {
      if (/^(?:data:|blob:|mailto:|tel:)/i.test(reference.value)) continue;
      let url;
      try { url = new URL(reference.value, `${origin}${route}`); } catch { failures.push(`${route}: invalid URL ${reference.value}`); continue; }
      check(!/^(?:www\.)?example\.(?:com|org|net)$/.test(url.hostname), `${route}: placeholder destination ${url.href}`);
      if (url.origin !== origin) continue;
      reference.asset ? assets++ : internalLinks++;
      await targetExists(url, `${route} <${name}> ${reference.value}`, !reference.asset);
    }
  }
}
for (const filename of files.filter((file) => file.endsWith('.css'))) {
  const css = await readFile(filename, 'utf8');
  const sourceURL = new URL(`/${path.relative(root, filename).split(path.sep).join('/')}`, origin);
  for (const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
    if (/^(?:data:|#)/.test(match[1])) continue;
    const url = new URL(match[1], sourceURL);
    if (url.origin === origin) { assets++; await targetExists(url, `${sourceURL.pathname} CSS asset`, false); }
  }
}

const resume = 'assets/CV_Gabriel_Silva_Gouvea_en-US.pdf';
try {
  const original = await readFile(resume);
  check(createHash('sha256').update(original).digest('hex') === '6d73ea37702a0da037ccb950bdb81f1730614b0044e641f98822509e71f925c2', 'Resume must match the latest user-supplied PDF');
  assert.equal(original.subarray(0, 5).toString(), '%PDF-', 'Resume source is not a PDF');
  for (const filename of [`public/${resume}`, `dist/${resume}`]) {
    const copy = await readFile(filename);
    check(original.equals(copy), `${filename}: resume must remain an exact byte-for-byte copy`);
  }
  console.log(`Resume source SHA-256: ${createHash('sha256').update(original).digest('hex')}`);
} catch (error) { failures.push(`Resume verification: ${error.message}`); }
check(pages.get('/about/')?.html.includes(`href="/${resume}"`), 'Career page must link to the current resume');

for (const [source, notice] of [
  ['node_modules/@fontsource-variable/inter/LICENSE', 'assets/fonts/INTER-LICENSE.txt'],
  ['node_modules/@fontsource/jetbrains-mono/LICENSE', 'assets/fonts/JETBRAINS-MONO-LICENSE.txt'],
]) {
  try {
    const original = await readFile(source);
    for (const directory of ['public', root]) {
      const filename = path.join(directory, notice);
      check(original.equals(await readFile(filename)), `${filename}: preserve the font package's complete license notice`);
    }
  } catch (error) { failures.push(`Font license verification: ${error.message}`); }
}

try {
  const photographs = JSON.parse(await readFile('src/data/personal-photo-assets.json', 'utf8'));
  check(photographs.length === 15, 'Personal gallery must contain exactly five curated photographs with three variants each');
  const expected = photographs.map((photo) => photo.src.split('/').at(-1)).sort();
  for (const directory of ['public', root]) {
    const actual = (await readdir(path.join(directory, 'photos/about'))).sort();
    check(JSON.stringify(actual) === JSON.stringify(expected), `${directory}: only approved optimized photo variants may be published`);
    for (const photo of photographs) {
      const filename = path.join(directory, photo.src);
      const bytes = await readFile(filename);
      check(bytes.length === photo.bytes, `${filename}: unexpected photo size`);
      check(createHash('sha256').update(bytes).digest('hex') === photo.sha256, `${filename}: photo differs from the reviewed asset`);
      check(bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP', `${filename}: expected WebP`);
      for (let offset = 12; offset + 8 <= bytes.length;) {
        const chunk = bytes.subarray(offset, offset + 4).toString();
        const length = bytes.readUInt32LE(offset + 4);
        check(['VP8 ', 'VP8L', 'VP8X', 'ALPH'].includes(chunk), `${filename}: unexpected metadata or animation chunk ${chunk}`);
        offset += 8 + length + (length % 2);
        check(offset <= bytes.length, `${filename}: invalid WebP chunk length`);
      }
    }
  }
} catch (error) { failures.push(`Personal photo verification: ${error.message}`); }

if (failures.length) {
  console.error(`\nStatic verification failed (${failures.length}):\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exitCode = 1;
} else console.log(`Static verification passed: ${pages.size} routes, ${internalLinks} internal links/fragments, ${assets} asset references, supplied resume preserved byte-for-byte.`);
