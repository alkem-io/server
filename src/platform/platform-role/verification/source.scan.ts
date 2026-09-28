import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import type { PlatformAdminGateHome } from './non.admin.surfaces';

/**
 * 027-platform-role-redesign (QA cross-census-3) — the source-scan helpers
 * shared by the drift detector (`surface.drift.spec.ts`) and the census
 * completeness gate (`surface.completeness.spec.ts`). Split out of the drift
 * spec because Biome's `noExportsInTest` forbids exporting from a
 * `*.spec.ts`, and two specs now need the same file walk and gate pattern.
 * Pure text scanning — no AST, no Nest DI.
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

/** The retiring catch-all, as a source token. `\b` keeps
 * `PLATFORM_ADMIN_…`-prefixed names from matching. */
export const PLATFORM_ADMIN_TOKEN = /AuthorizationPrivilege\.PLATFORM_ADMIN\b/;

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

/** A class-member DECLARATION at class-body indentation (two spaces, the
 * repo's Biome format), optionally `public|private|protected` and `async`.
 * Anchored to a declaration rather than any `member(` token, so a member
 * that is only CALLED in the file (`this.member(`) — e.g. a deleted method
 * still referenced — does not count as declared. */
const MEMBER_DECLARATION =
  /^ {2}(?:public |private |protected )?(?:async )?([A-Za-z_$][\w$]*)\s*\(/;

/** Control-flow keywords that can open a line at two-space indent in
 * pathological formatting; never class members. */
const NOT_A_MEMBER = new Set([
  'if',
  'for',
  'while',
  'switch',
  'return',
  'catch',
  'function',
]);

/** A line that closes a class member: exactly `  }` (the repo's Biome
 * format). NOT `  })` — that closes a decorator's options object
 * (`@ResolveField(() => X, {…})`), which sits INSIDE a member's segment. */
const MEMBER_CLOSE = /^ {2}\}\s*$/;
/** A member whose body is EMPTY closes on its own signature line —
 * typically the DI constructor's `  ) {}`. */
const EMPTY_BODY_CLOSE = /^ {2}\S.*\{\s*\}\s*$/;
const closesMember = (line: string): boolean =>
  MEMBER_CLOSE.test(line) || EMPTY_BODY_CLOSE.test(line);
const CLASS_LINE = /\bclass\s+[A-Za-z_$]/;

/** Every class member declared in `content`, in source order. */
export function declaredMembers(content: string): readonly string[] {
  const members: string[] = [];
  for (const line of content.split('\n')) {
    const match = MEMBER_DECLARATION.exec(line);
    if (match && !NOT_A_MEMBER.has(match[1])) {
      members.push(match[1]);
    }
  }
  return members;
}

/**
 * The source SEGMENT of one declared member: from the line after the
 * previous member's closing `  }` (or after the class line, for the first
 * member) up to and including the member's own closing `  }`. It therefore
 * includes the member's decorator block (`@AuthorizationActorHasPrivilege(…)`
 * sits above the declaration). Returns `undefined` when the member is not
 * DECLARED in `content` (a call site alone is not enough).
 */
export function memberSegment(
  content: string,
  member: string
): string | undefined {
  const lines = content.split('\n');
  const declarationIndex = lines.findIndex(line => {
    const match = MEMBER_DECLARATION.exec(line);
    return match !== null && match[1] === member;
  });
  if (declarationIndex === -1) {
    return undefined;
  }
  let start = 0;
  for (let i = declarationIndex - 1; i >= 0; i--) {
    if (closesMember(lines[i]) || CLASS_LINE.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  let end = lines.length - 1;
  for (let i = declarationIndex; i < lines.length; i++) {
    if (closesMember(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end + 1).join('\n');
}

/** True only when `member` is DECLARED in `content` AND its own segment
 * (decorators included) names `AuthorizationPrivilege.PLATFORM_ADMIN`. A
 * member that exists but was re-gated onto another privilege is `false` —
 * the stale-declaration case a whole-file check cannot see. */
export function gatesOnPlatformAdmin(content: string, member: string): boolean {
  const segment = memberSegment(content, member);
  return segment !== undefined && PLATFORM_ADMIN_TOKEN.test(segment);
}

/** Every declared member of `content` whose own segment names
 * `AuthorizationPrivilege.PLATFORM_ADMIN`. */
export function platformAdminGatingMembers(content: string): readonly string[] {
  return [...new Set(declaredMembers(content))].filter(member =>
    gatesOnPlatformAdmin(content, member)
  );
}

/** A file is a PLATFORM_ADMIN gate site when it contains a gate-position
 * call shape AND names the privilege anywhere. */
export function isPlatformAdminGateFile(content: string): boolean {
  return GATE_CALL_PATTERN.test(content) && PLATFORM_ADMIN_TOKEN.test(content);
}

/** Reverse lookup (value → enum key) so a replacement privilege can be
 * matched as its literal `AuthorizationPrivilege.KEY` source token. */
const PRIVILEGE_KEY_BY_VALUE: ReadonlyMap<string, string> = new Map(
  Object.entries(AuthorizationPrivilege).map(([key, value]) => [
    value as string,
    key,
  ])
);

/** Placeholder shapes a home must never carry (QA cross-census-3: a home is
 * a concrete privilege or a real task id, never "T0xx" / "<Slice B task>"). */
const PLACEHOLDER = /<|T0xx/i;

/**
 * QA cross-census-3 (census check 3) — checks `PLATFORM_ADMIN_GATE_HOMES`
 * against the scanned source, PER MEMBER, and returns every violation as a
 * message (empty = consistent). Pure over its inputs, so the spec can run it
 * against deliberately broken maps (negative cases) as well as the real one.
 *
 * `exemptFiles` are the files the census itself declares with
 * `gate.requires === PLATFORM_ADMIN` (A1 actor, A9 conversion) — accounted
 * for by `A_ROW_SURFACES`, so they must NOT also appear in the homes map.
 */
export function checkPlatformAdminGateHomes(input: {
  readonly files: ReadonlyMap<string, string>;
  readonly homes: Readonly<
    Record<string, Readonly<Record<string, PlatformAdminGateHome>>>
  >;
  readonly exemptFiles: ReadonlySet<string>;
}): string[] {
  const { files, homes, exemptFiles } = input;
  const errors: string[] = [];

  // Completeness — every PLATFORM_ADMIN-gating member of every gate file.
  for (const [file, content] of files) {
    if (!isPlatformAdminGateFile(content) || exemptFiles.has(file)) {
      continue;
    }
    const declared = homes[file];
    if (!declared) {
      errors.push(
        `${file}: gates on PLATFORM_ADMIN but has no PLATFORM_ADMIN_GATE_HOMES entry`
      );
      continue;
    }
    for (const member of platformAdminGatingMembers(content)) {
      if (!Object.hasOwn(declared, member)) {
        errors.push(
          `${file}#${member}: gates on PLATFORM_ADMIN but is not listed in its PLATFORM_ADMIN_GATE_HOMES entry`
        );
      }
    }
  }

  // Staleness + home validity — every declared file and member.
  for (const [file, members] of Object.entries(homes)) {
    if (exemptFiles.has(file)) {
      errors.push(
        `${file}: is census-declared with gate.requires PLATFORM_ADMIN — it must not also be a PLATFORM_ADMIN_GATE_HOMES key`
      );
      continue;
    }
    const content = files.get(file);
    if (content === undefined) {
      errors.push(
        `${file}: listed in PLATFORM_ADMIN_GATE_HOMES but does not exist under src/`
      );
      continue;
    }
    if (!isPlatformAdminGateFile(content)) {
      errors.push(
        `${file}: listed in PLATFORM_ADMIN_GATE_HOMES but no longer gates on PLATFORM_ADMIN (stale)`
      );
      continue;
    }
    if (Object.keys(members).length === 0) {
      errors.push(`${file}: PLATFORM_ADMIN_GATE_HOMES entry lists no members`);
    }
    for (const [member, home] of Object.entries(members)) {
      const segment = memberSegment(content, member);
      if (segment === undefined) {
        errors.push(
          `${file}#${member}: listed in PLATFORM_ADMIN_GATE_HOMES but is not DECLARED in the file (stale)`
        );
        continue;
      }
      if (!PLATFORM_ADMIN_TOKEN.test(segment)) {
        errors.push(
          `${file}#${member}: listed in PLATFORM_ADMIN_GATE_HOMES but its own segment no longer names PLATFORM_ADMIN (stale — re-gated?)`
        );
      }
      if (PLACEHOLDER.test(JSON.stringify(home))) {
        errors.push(
          `${file}#${member}: home ${JSON.stringify(home)} is a placeholder, not a concrete home`
        );
      }
      if ('replacedBy' in home) {
        if (home.replacedBy.length === 0) {
          errors.push(`${file}#${member}: replacedBy names no privilege`);
        }
        for (const privilege of home.replacedBy) {
          const key = PRIVILEGE_KEY_BY_VALUE.get(privilege);
          if (
            !key ||
            key === 'PLATFORM_ADMIN' ||
            !segment.includes(`AuthorizationPrivilege.${key}`)
          ) {
            errors.push(
              `${file}#${member}: replacedBy ${privilege} is not a replacement privilege checked in the member's own segment`
            );
          }
        }
      }
      if ('regateBeforeT074' in home && home.regateBeforeT074.length === 0) {
        errors.push(`${file}#${member}: regateBeforeT074 says nothing`);
      }
    }
  }

  return errors;
}
