import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  A_ROW_SURFACES,
  INDIRECT_ENFORCEMENT_FILES,
  type SurfaceRef,
} from './a.row.surfaces';
import {
  isAnyOfGate,
  isConditionGate,
  isCredentialGate,
  isRequiresGate,
  privilegesNamedByGate,
} from './gate.model';
import {
  EXCLUDED_FROM_SCAN,
  PLATFORM_ADMIN_SCAN_ALLOWLIST,
  privilegeEnumKey,
  SCANNED_PRIVILEGES,
} from './scanned.privileges';

/**
 * 027-platform-role-redesign (T052a, research D24, FR-010) — the census
 * DRIFT DETECTOR. Three rules, all against `src/**\/*.ts` as it exists on
 * disk right now — none of them read `A_ROW_SURFACES` as ground truth about
 * the CODE; they read it as ground truth about what was DECLARED, and
 * check the code against it.
 *
 * - Rule 1 — a whole NEW gated surface: every file where a scanned
 *   privilege appears at a gate-position call must be a file this census
 *   accounts for.
 * - Rule 2 — a gate added INSIDE an already-censused file: the set of
 *   scanned privileges actually found in a censused file must equal the
 *   set the census declares for it.
 * - Rule 3 — the two NON-privilege gate components (`{credential}` /
 *   `{condition}`) must agree with the code, in BOTH directions. Rules 1/2
 *   only see privilege-shaped gates; this is the only mechanical check on
 *   the other two (fifteenth analyze pass, closing C2).
 *
 * **Stated limits — do not paper over them:**
 *  1. A resolver that forgets to gate an action AT ALL is invisible to a
 *     scan built around "which privilege is checked" — there is no gate to
 *     find. That gap is closed by `test-suites`' denial cells (FR-024),
 *     which fail when an UNGATED surface answers a role that should be
 *     denied. The two detectors are complements, which is why FR-033 keeps
 *     both layers.
 *  2. `SCANNED_PRIVILEGES` deliberately EXCLUDES the five baseline CRUD
 *     verbs (`CREATE`/`READ`/`UPDATE`/`DELETE`/`GRANT`) and the retiring
 *     `PLATFORM_ADMIN` catch-all, even where a census gate expression names
 *     one of them (A6/A7/A8's `anyOf` owner branch; A9's three
 *     resolver-local-`PLATFORM_ADMIN`-policy conversion mutations; A13's
 *     bare-CRUD-gated license definitions; A16's plain `READ`). These six
 *     are the vocabulary reused by ordinary, non-administrative gates
 *     across this ~3k-file codebase — a text scan that included them would
 *     flag dozens of files that have nothing to do with this feature's
 *     eight admin families (verified empirically while building this
 *     census: 28+ files check bare `DELETE` at a gate-position call shape
 *     alone). A new gate site added to one of THOSE six privileges is
 *     therefore ALSO invisible here — the same class of blind spot as (1),
 *     for a different reason (over-, not under-, matching a privilege
 *     name), and covered by the same complement (`test-suites`' denial
 *     cells, plus this repo's own per-policy grant-set specs, T070f).
 *
 * **Text scan, not an AST pass.** The three gate-position shapes
 * (`@AuthorizationActorHasPrivilege(…)`, `grantAccessOrFail(…, …)`,
 * `isAccessGranted(…, …)`) are matched as fixed literal call-opening
 * tokens; a privilege token is counted as present in a file if it appears
 * ANYWHERE in a file that also contains at least one such call — a
 * WHOLE-FILE co-occurrence, not a same-line match. This is deliberately
 * tolerant of the one indirection this feature has
 * (`PlatformRoleAssignmentRulesService.checkAssignerCapability()` selects
 * its privilege via a ternary a few lines above the call that checks it) —
 * a regex that over-matches fails loudly rather than silently, and a
 * whole-file join is the cheapest thing that does not choke on that shape.
 */

const SRC_ROOT = join(process.cwd(), 'src');

/** This whole directory is excluded from the scan — it IS the census (and
 * its declaration/derivation files), not code to be scanned. Its files
 * legitimately reference every `AuthorizationPrivilege` member by name and
 * mention the three gate-call shapes in prose (this very file's own JSDoc
 * does, e.g. `` `isAccessGranted()` `` in `a.row.surfaces.ts`'s comments) —
 * scanning them would make the census a "hit" against itself. */
const VERIFICATION_DIR = join(
  SRC_ROOT,
  'platform',
  'platform-role',
  'verification'
);

const GATE_CALL_PATTERN =
  /@AuthorizationActorHasPrivilege\(|grantAccessOrFail\(|isAccessGranted\(/;

/** Every `.ts` file under `src/`, repo-relative with forward slashes,
 * excluding this verification directory's own specs (`*.spec.ts`) and this
 * detector's own inventory files (they are the declaration, not a gate
 * site to be scanned). `*.it-spec.ts` lives under `test/`, outside `src/`,
 * so it is excluded by construction (C13). */
function listSourceFiles(): readonly string[] {
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

interface FileScan {
  readonly hasGateCall: boolean;
  readonly scannedPrivileges: ReadonlySet<AuthorizationPrivilege>;
  readonly content: string;
}

function scanFile(repoRelativePath: string): FileScan {
  const content = readFileSync(join(process.cwd(), repoRelativePath), 'utf-8');
  const hasGateCall = GATE_CALL_PATTERN.test(content);
  const scannedPrivileges = new Set<AuthorizationPrivilege>();
  for (const privilege of SCANNED_PRIVILEGES) {
    if (
      content.includes(`AuthorizationPrivilege.${privilegeEnumKey(privilege)}`)
    ) {
      scannedPrivileges.add(privilege);
    }
  }
  return { hasGateCall, scannedPrivileges, content };
}

/** Every (non-placeholder) `file` value declared anywhere in the census,
 * mapped to every entry declared at that file — across all 22 rows. A
 * placeholder (A17's two `(T078, Slice B — …)` strings) is never a real
 * path and is excluded; it can never be scanned in from disk, so excluding
 * it here only avoids a confusing `fs.readFileSync` attempt. */
function censusEntriesByFile(): ReadonlyMap<string, readonly SurfaceRef[]> {
  const byFile = new Map<string, SurfaceRef[]>();
  for (const surfaces of Object.values(A_ROW_SURFACES)) {
    for (const surface of surfaces) {
      if (surface.file.startsWith('(')) {
        continue; // not-yet-created (Slice B) surface — see a.row.surfaces.ts
      }
      const existing = byFile.get(surface.file) ?? [];
      existing.push(surface);
      byFile.set(surface.file, existing);
    }
  }
  return byFile;
}

/** Privileges a file's census entries declare for RULE 2 — the union, over
 * every entry at that file, of (a) privileges its `requires`/`anyOf` gate
 * names, and (b) for a `{credential}`/`{condition}` gate, any
 * `SCANNED_PRIVILEGES` member whose enum key appears as a substring of the
 * gate's own `reason` text. (b) exists for exactly one documented shape —
 * T034a's FR-022 pin, whose `reason` deliberately names the shared
 * `GRANT_GLOBAL_ADMINS` privilege it is pinned ahead of, which the code
 * ALSO still passes as a literal (checked-against-a-narrower-policy)
 * argument to `grantAccessOrFail` — a real, scannable token that a
 * privilege-only view of a `{credential}` gate would otherwise miss. */
function declaredPrivilegesForFile(
  entries: readonly SurfaceRef[]
): ReadonlySet<AuthorizationPrivilege> {
  const declared = new Set<AuthorizationPrivilege>();
  for (const entry of entries) {
    for (const privilege of privilegesNamedByGate(entry.gate)) {
      if (!EXCLUDED_FROM_SCAN.has(privilege)) {
        declared.add(privilege);
      }
    }
    if (isCredentialGate(entry.gate) || isConditionGate(entry.gate)) {
      for (const privilege of SCANNED_PRIVILEGES) {
        if (entry.gate.reason.includes(privilegeEnumKey(privilege))) {
          declared.add(privilege);
        }
      }
    }
  }
  return declared;
}

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function symmetricDifference<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): T[] {
  const diff: T[] = [];
  for (const v of a) if (!b.has(v)) diff.push(v);
  for (const v of b) if (!a.has(v)) diff.push(v);
  return diff;
}

describe('surface.drift.spec (T052a) — census vs. code', () => {
  const sourceFiles = listSourceFiles();
  const scans = new Map<string, FileScan>(
    sourceFiles.map(f => [f, scanFile(f)])
  );
  const censusFiles = censusEntriesByFile();
  const knownFiles = new Set<string>([
    ...censusFiles.keys(),
    ...INDIRECT_ENFORCEMENT_FILES,
  ]);

  it('SCANNED_PRIVILEGES is non-empty and excludes the six baseline verbs', () => {
    expect(SCANNED_PRIVILEGES.length).toBeGreaterThan(0);
    for (const excluded of EXCLUDED_FROM_SCAN) {
      expect(SCANNED_PRIVILEGES).not.toContain(excluded);
    }
  });

  describe('rule 1 — every gate-position hit lands in a known file', () => {
    for (const file of sourceFiles) {
      const scan = scans.get(file)!;
      if (!scan.hasGateCall || scan.scannedPrivileges.size === 0) {
        continue;
      }
      it(`${file} is declared in A_ROW_SURFACES or INDIRECT_ENFORCEMENT_FILES`, () => {
        expect(knownFiles.has(file)).toBe(true);
      });
    }
  });

  // sec-server-5 fix (round 2 of 2) — rule 1b: a NARROW, per-file scan for
  // `PLATFORM_ADMIN` gate-position hits, restricted to
  // `PLATFORM_ADMIN_SCAN_ALLOWLIST` so it cannot flood the ~24 unrelated
  // files across the codebase that also reference `PLATFORM_ADMIN`. This is
  // what would have caught sec-server-9: `grantCredentialToActor`/
  // `revokeCredentialFromActor` gate on `PLATFORM_ADMIN`, and
  // `PLATFORM_ADMIN` was — and, for every OTHER file, remains — wholly
  // excluded from `SCANNED_PRIVILEGES`.
  describe('rule 1b — PLATFORM_ADMIN hits in the allowlisted credential-admin files are censused', () => {
    for (const file of PLATFORM_ADMIN_SCAN_ALLOWLIST) {
      it(`${file}: any PLATFORM_ADMIN gate hit is declared in A_ROW_SURFACES or INDIRECT_ENFORCEMENT_FILES`, () => {
        const scan = scans.get(file);
        expect(
          scan,
          `PLATFORM_ADMIN_SCAN_ALLOWLIST names "${file}" but it does not exist under src/`
        ).toBeDefined();
        const hasPlatformAdminGate =
          scan!.hasGateCall &&
          /AuthorizationPrivilege\.PLATFORM_ADMIN/.test(scan!.content);
        if (!hasPlatformAdminGate) {
          // Nothing to check — the file no longer gates on PLATFORM_ADMIN
          // at all (e.g. migrated off it entirely); not a drift failure.
          return;
        }
        expect(knownFiles.has(file)).toBe(true);
      });
    }
  });

  // sec-server-5 fix (round 2 of 2) — rule 4: an INVERSE completeness check
  // that needs no reachability baseline (unlike rules 1/2, which can only
  // ever find privileges the census already names). Enumerates every
  // `@Mutation`/`@Query` resolver file that either (a) writes a credential
  // directly (`grantCredentialOrFail`/`revokeCredential` on an actor) or
  // (b) accepts a `CredentialType`/`AuthorizationCredential`/`RoleName`-typed
  // GraphQL argument, and fails the build for any such file absent from the
  // census — this is the check that would have caught BOTH sec-server-9
  // (a credential-write resolver) and sec-server-10 (a credential-typed-
  // argument query) on its own, independent of which privilege literal, if
  // any, happens to be scannable at the call site.
  describe('rule 4 — credential-write / credential-argument resolvers are censused', () => {
    const CREDENTIAL_WRITE_PATTERN =
      /\.grantCredentialOrFail\(|\.revokeCredential\(/;
    const CREDENTIAL_TYPED_ARG_PATTERN =
      /@Args\([^)]*type:\s*\(\)\s*=>\s*(CredentialType|AuthorizationCredential|RoleName)\b/;
    const RESOLVER_DECORATOR_PATTERN = /@Mutation\(|@Query\(/;

    for (const file of sourceFiles) {
      const scan = scans.get(file)!;
      if (!RESOLVER_DECORATOR_PATTERN.test(scan.content)) {
        continue;
      }
      const writesCredentials = CREDENTIAL_WRITE_PATTERN.test(scan.content);
      const hasCredentialTypedArg = CREDENTIAL_TYPED_ARG_PATTERN.test(
        scan.content
      );
      if (!writesCredentials && !hasCredentialTypedArg) {
        continue;
      }
      it(`${file}: writes a credential or accepts a RoleName/CredentialType-typed argument — must be declared in A_ROW_SURFACES or INDIRECT_ENFORCEMENT_FILES`, () => {
        expect(knownFiles.has(file)).toBe(true);
      });
    }
  });

  describe('rule 2 — per-file scanned privileges equal declared privileges', () => {
    for (const [file, entries] of censusFiles) {
      it(`${file}: scanned set matches declared set`, () => {
        const scan = scans.get(file);
        expect(
          scan,
          `census declares "${file}" but it does not exist under src/`
        ).toBeDefined();
        const scanned = scan!.scannedPrivileges;
        const declared = declaredPrivilegesForFile(entries);
        const diff = symmetricDifference(scanned, declared);
        expect(
          setsEqual(scanned, declared),
          `${file}: symmetric difference = [${diff.join(', ')}] ` +
            `(scanned=[${[...scanned].join(', ')}], declared=[${[...declared].join(', ')}])`
        ).toBe(true);
      });
    }
  });

  describe('rule 3 — the two non-privilege gate components agree with the code', () => {
    // --- (a) the credential-level pin (T034a, FR-022) — a fixed call
    // shape: `createGlobalRolesAuthorizationPolicy([AuthorizationRoleGlobal
    // .GLOBAL_ADMIN], …)`, a SINGLE-element array (the two-and-three-
    // element arrays elsewhere, e.g. the conversion and admin-communication
    // resolvers' OWN synthetic policies, are a DIFFERENT shape — they
    // already include a new role and are not a pin).
    const CREDENTIAL_PIN_PATTERN =
      /createGlobalRolesAuthorizationPolicy\(\s*\[\s*AuthorizationRoleGlobal\.GLOBAL_ADMIN\s*\]/;

    it('credential-pin declarations and code agree, in both directions', () => {
      const declaredFiles = new Set<string>();
      for (const [file, entries] of censusFiles) {
        if (entries.some(e => isCredentialGate(e.gate))) {
          declaredFiles.add(file);
        }
      }
      const codeFiles = new Set<string>();
      for (const file of sourceFiles) {
        if (CREDENTIAL_PIN_PATTERN.test(scans.get(file)!.content)) {
          codeFiles.add(file);
        }
      }
      const diff = symmetricDifference(declaredFiles, codeFiles);
      expect(
        setsEqual(declaredFiles, codeFiles),
        `credential-pin file sets differ: symmetric difference = [${diff.join(', ')}] ` +
          `(declared=[${[...declaredFiles].join(', ')}], code=[${[...codeFiles].join(', ')}])`
      ).toBe(true);
    });

    // --- (b) named runtime conditions (currently just A15's
    // `allowPlatformSupportAsAdmin`) — matched as an `if (…propertyName)`
    // predicate so a plain data-plumbing reference (the DTOs, the bootstrap
    // templates, `search.result.service.ts`'s query shape) does not count
    // as a gate site.
    it('named-condition declarations and code agree, in both directions', () => {
      const declaredConditionsByFile = new Map<string, Set<string>>();
      for (const [file, entries] of censusFiles) {
        for (const entry of entries) {
          if (isConditionGate(entry.gate)) {
            const set = declaredConditionsByFile.get(file) ?? new Set();
            set.add(entry.gate.condition);
            declaredConditionsByFile.set(file, set);
          }
        }
      }
      const allConditionNames = new Set(
        [...declaredConditionsByFile.values()].flatMap(s => [...s])
      );

      for (const conditionName of allConditionNames) {
        const pattern = new RegExp(`if\\s*\\([^)]*\\.${conditionName}\\)`);
        const codeFiles = new Set<string>();
        for (const file of sourceFiles) {
          if (pattern.test(scans.get(file)!.content)) {
            codeFiles.add(file);
          }
        }
        const declaredFiles = new Set(
          [...declaredConditionsByFile.entries()]
            .filter(([, names]) => names.has(conditionName))
            .map(([file]) => file)
        );
        const diff = symmetricDifference(declaredFiles, codeFiles);
        expect(
          setsEqual(declaredFiles, codeFiles),
          `condition "${conditionName}" file sets differ: symmetric difference = [${diff.join(', ')}] ` +
            `(declared=[${[...declaredFiles].join(', ')}], code=[${[...codeFiles].join(', ')}])`
        ).toBe(true);
      }
    });
  });

  // Exercise every gate shape's type guard at least once so a future
  // change to `gate.model.ts`'s union shows up as a real assertion here,
  // not only as a `tsc` exhaustiveness error in `reachability.ts`.
  it('every declared gate is one of the four closed shapes', () => {
    for (const surfaces of Object.values(A_ROW_SURFACES)) {
      for (const surface of surfaces) {
        const shapes = [
          isRequiresGate(surface.gate),
          isAnyOfGate(surface.gate),
          isCredentialGate(surface.gate),
          isConditionGate(surface.gate),
        ];
        expect(shapes.filter(Boolean).length).toBe(1);
      }
    }
  });
});
