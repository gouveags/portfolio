/** Approximate reading time for an article body, excluding Markdown/HTML scaffolding. */
export function readingTime(markdown = ""): string {
  const text = markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\[[^\]]+\]:\s+.*$/gm, "")
    .replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/^\s*(`{3,}|~{3,}).*$/gm, " ");
  const words =
    text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}
