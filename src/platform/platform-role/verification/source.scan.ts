import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * 027-platform-role-redesign (QA cross-census-3) — the source-scan helpers
 * used by the drift detector (`surface.drift.spec.ts`). Split out of the drift
 * spec because Biome's `noExportsInTest` forbids exporting from a
 * `*.spec.ts`. Slice A's census check 3 (per-member PLATFORM_ADMIN gate homes)
 * also lived here; Slice B (T074) deleted the privilege, so the compiler now
 * rules out every gate that check tracked and it is gone. Pure text scanning —
 * no AST, no Nest DI.
 */

const SRC_ROOT = join(process.cwd(), 'src');

/** This whole directory is excluded from every scan — it IS the census (and
 * its declaration/derivation files), not code to be scanned. Its files
 * legitimately reference every `AuthorizationPrivilege` member by name and
 * mention the three gate-call shapes in prose — scanning them would make the
 * census a "hit" against itself. */
const VERIFICATION_DIR = join(
  SRC_ROOT,
  'platform',
  'platform-role',
  'verification'
);

/** The three gate-position call shapes (T052a): a privilege token in a file
 * that ALSO contains one of these is treated as a gate site. */
export const GATE_CALL_PATTERN =
  /@AuthorizationActorHasPrivilege\(|grantAccessOrFail\(|isAccessGranted\(/;

/** Every `.ts` file under `src/`, repo-relative with forward slashes,
 * excluding `*.spec.ts` and this verification directory. `*.it-spec.ts`
 * lives under `test/`, outside `src/`, so it is excluded by construction. */
export function listSourceFiles(): readonly string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    if (dir === VERIFICATION_DIR) {
      return;
    }
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
        results.push(full);
      }
    }
  };
  walk(SRC_ROOT);
  return results.map(f => relative(process.cwd(), f).split(sep).join('/'));
}
