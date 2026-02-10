/**
 * CODEOWNERS parser & matching utilities (T026)
 * Minimal implementation: parse lines of form:
 *   <pattern> <owner1> <owner2> ...
 * Comments (#) and blank lines ignored. Patterns kept verbatim; no advanced gitignore matching yet.
 */
import { existsSync, readFileSync } from 'node:fs';

export interface CodeOwnerEntry {
  pattern: string;
  owners: string[]; // normalized (no leading @)
}

export function parseCodeOwnersFile(path = 'CODEOWNERS'): CodeOwnerEntry[] {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf-8').split(/\r?\n/);
  const entries: CodeOwnerEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue; // need at least a pattern + one owner
    const pattern = parts[0];
    const owners = parts
      .slice(1)
      .map(o => (o.startsWith('@') ? o.substring(1) : o));
    entries.push({ pattern, owners });
  }
  return entries;
}

/**
 * Collect unique owner identifiers across all entries.
 */
export function collectAllOwners(entries: CodeOwnerEntry[]): string[] {
  const set = new Set<string>();
  entries.forEach(e => e.owners.forEach(o => set.add(o)));
  return Array.from(set);
}

/**
 * Simple pattern match: currently supports '*' wildcard matching any substring.
 * Can be extended later to full minimatch/ignore semantics; kept simple for governance override resolution.
 */
export function patternMatches(pattern: string, path: string): boolean {
  if (pattern === '*') return true;
  // Escape regex special chars except '*'
  const regex = new RegExp(
    '^' +
      pattern
        .split('*')
        .map(p => p.replace(/[-/\\^$+?.()|[\]{}]/g, r => `\\${r}`))
        .join('.*') +
      '$'
  );
  return regex.test(path);
}

/**
 * Return owners whose patterns match a given file path.
 */
export function ownersForPath(
  entries: CodeOwnerEntry[],
  filePath: string
): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    if (patternMatches(e.pattern, filePath)) e.owners.forEach(o => set.add(o));
  }
  return Array.from(set);
}
