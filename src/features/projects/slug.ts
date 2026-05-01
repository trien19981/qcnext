/** Auto slug theo spec project-list (gần giống Python NFKD + ASCII). */
export function generateSlug(name: string): string {
  const decomposed = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  let s = decomposed
    .replace(/[^\w\s-]/g, "")
    .toLowerCase()
    .trim();
  s = s.replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "project";
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug.trim().toLowerCase());
}
