/** Keep public assets reachable on both the Site origin and GitHub's repository subpath. */
export function assetUrl(path: string): string {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return base + path.replace(/^\/+/, "");
}
