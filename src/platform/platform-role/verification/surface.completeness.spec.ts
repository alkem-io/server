import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { buildSchema, type GraphQLObjectType } from 'graphql';
import { describe, expect, it } from 'vitest';
import { A_ROW_SURFACES } from './a.row.surfaces';
import { isRequiresGate } from './gate.model';
import {
  NON_ADMIN_SURFACES,
  PLATFORM_ADMIN_GATE_HOMES,
  type PlatformAdminGateHome,
} from './non.admin.surfaces';
import {
  checkPlatformAdminGateHomes,
  gatesOnPlatformAdmin,
  listSourceFiles,
} from './source.scan';

/**
 * 027-platform-role-redesign (QA cross-census-1, census check 1, 2026-09-25)
 * — the census COMPLETENESS gate. `surface.drift.spec.ts` asks "does the
 * CODE agree with what the census declared"; this file asks a narrower,
 * cheaper question first: "does every surface the SCHEMA exposes have a
 * declared home at all" — either censused (`A_ROW_SURFACES`, one of the 21
 * A-rows) or classified (`NON_ADMIN_SURFACES`, deliberately NOT an A-row,
 * with a reason). A schema surface in neither net is exactly the shape of
 * gap C2-a found live: `createLicensePlan` was never censused, so nothing
 * here or in `test-suites` ever asked what reaches it.
 *
 * Built straight from `schema.graphql` (this repo's own committed contract,
 * `pnpm run schema:print`'d) rather than the TypeScript resolver tree, so
 * this stays a schema-shape check, not a second copy of `surface.drift`'s
 * source scan.
 *
 * Scope, deliberately narrow, matching the census's own: `Mutation` fields
 * and `platformAdmin.<field>` — the two surface kinds `A_ROW_SURFACES`
 * declares (`kind: 'graphql-mutation' | 'graphql-field'`, the latter used
 * ONLY for `platformAdmin`'s own children and MCP tools, which have no
 * schema-field representation to enumerate here). Query fields elsewhere in
 * the schema (`identity.identities`, ordinary domain queries, …) are out of
 * scope by the same construction the census itself uses.
 */

const SCHEMA_PATH = join(process.cwd(), 'schema.graphql');

function buildServerSchema() {
  return buildSchema(readFileSync(SCHEMA_PATH, 'utf-8'));
}

/** Every `Mutation` field, plus every `PlatformAdminQueryResults` field
 * prefixed `platformAdmin.` — the same two-part shape `crossCutting.census`
 * (QA handover) specifies. */
function schemaSurfaces(): readonly string[] {
  const schema = buildServerSchema();
  const mutationFields = Object.keys(schema.getMutationType()!.getFields());
  const platformAdminType = schema.getType(
    'PlatformAdminQueryResults'
  ) as GraphQLObjectType;
  const platformAdminFields = Object.keys(platformAdminType.getFields()).map(
    f => `platformAdmin.${f}`
  );
  return [...mutationFields, ...platformAdminFields];
}

/** The census's own declared surface names, as both the bare resolver
 * member name AND (additively) the `platformAdmin.`-prefixed form.
 *
 * Why both: `A_ROW_SURFACES` declares every `graphql-field` member as the
 * bare resolver method name (A5's `mcpApiKeys`, A16's
 * `latestUserEmailChangeAuditEntry`/`userEmailChangeAuditEntries`) — that is
 * the pre-existing convention this repo's `graphql-field` entries already
 * use, unrelated to this pass. The SCHEMA surface for a `platformAdmin`
 * child field, on the other hand, is only reachable as
 * `platformAdmin.<field>` (it is a nested field, not a root one) — and
 * `NON_ADMIN_SURFACES`' own three `platformAdmin.*` keys (per QA's literal
 * instruction, e.g. `'platformAdmin.virtualAssistant'`) use that prefixed
 * form too. Registering both forms for every entry is a superset that costs
 * nothing (an unmatched extra membership, e.g. `platformAdmin.deleteUser`,
 * is never looked up against a real surface) and correctly recognizes the
 * three already-censused `platformAdmin` children as censused rather than
 * flagging them as a false-positive gap. */
function censusedSurfaces(): ReadonlySet<string> {
  const censused = new Set<string>();
  for (const surfaces of Object.values(A_ROW_SURFACES)) {
    for (const surface of surfaces) {
      const name =
        typeof surface.member === 'string' ? surface.member : surface.member.A;
      censused.add(name);
      censused.add(`platformAdmin.${name}`);
    }
  }
  return censused;
}

describe('surface completeness (QA cross-census-1, census check 1) — every schema surface is censused or classified', () => {
  it('every Mutation field / platformAdmin.<field> is either censused (A_ROW_SURFACES) or classified (NON_ADMIN_SURFACES)', () => {
    const surfaces = schemaSurfaces();
    const censused = censusedSurfaces();
    const uncovered = surfaces.filter(
      s => !censused.has(s) && !(s in NON_ADMIN_SURFACES)
    );
    expect(uncovered).toEqual([]);
  });

  it('no stale classification — every NON_ADMIN_SURFACES key is a real schema surface', () => {
    const surfaces = new Set(schemaSurfaces());
    const stale = Object.keys(NON_ADMIN_SURFACES).filter(
      key => !surfaces.has(key)
    );
    expect(stale).toEqual([]);
  });

  it('censused and classified never overlap — no surface is both an A-row and a non-admin classification', () => {
    const censused = censusedSurfaces();
    const doubleCounted = Object.keys(NON_ADMIN_SURFACES).filter(key =>
      censused.has(key)
    );
    expect(doubleCounted).toEqual([]);
  });

  it("every legacy-platform-admin classification's reason names a real file that is its PLATFORM_ADMIN_GATE_HOMES home", () => {
    // Two halves. Structural: the reason string must NAME an actual file
    // this repo ships. Agreement (census check 3, QA cross-census-3): that
    // file is a `PLATFORM_ADMIN_GATE_HOMES` key listing THIS member — keyed
    // on the same file/member pairs the gate-homes check verifies against
    // the code, so a classification and its home cannot drift apart.
    const FILE_PATH_PATTERN = /\bsrc\/[A-Za-z0-9_\-./]+\.ts\b/g;
    const legacyEntries = Object.entries(NON_ADMIN_SURFACES).filter(
      ([, classification]) =>
        classification.disposition === 'legacy-platform-admin'
    );
    expect(legacyEntries.length).toBeGreaterThan(0);
    for (const [key, classification] of legacyEntries) {
      const filePaths = classification.reason.match(FILE_PATH_PATTERN) ?? [];
      expect(
        filePaths.length,
        `${key}'s reason names no file path at all`
      ).toBeGreaterThan(0);
      for (const filePath of filePaths) {
        expect(
          existsSync(join(process.cwd(), filePath)),
          `${key}'s reason names ${filePath}, which does not exist`
        ).toBe(true);
      }
      const member = key.startsWith('platformAdmin.')
        ? key.slice('platformAdmin.'.length)
        : key;
      const homedIn = filePaths.filter(filePath =>
        Object.hasOwn(PLATFORM_ADMIN_GATE_HOMES[filePath] ?? {}, member)
      );
      expect(
        homedIn.length,
        `${key}: none of the files its reason names (${filePaths.join(', ')}) lists '${member}' in PLATFORM_ADMIN_GATE_HOMES`
      ).toBeGreaterThan(0);
    }
  });

  it('every classification uses one of the five closed dispositions', () => {
    const validDispositions = new Set([
      'non-admin',
      'inventory-read',
      'legacy-platform-admin',
      'slice-b-deletion',
      'pending-ruling',
    ]);
    for (const [key, classification] of Object.entries(NON_ADMIN_SURFACES)) {
      expect(
        validDispositions.has(classification.disposition),
        `${key} has an unrecognized disposition: ${classification.disposition}`
      ).toBe(true);
      expect(
        classification.reason.length,
        `${key}'s reason is empty`
      ).toBeGreaterThan(0);
    }
  });
});

/**
 * 027-platform-role-redesign (QA cross-census-3, census check 3) — every
 * remaining `AuthorizationPrivilege.PLATFORM_ADMIN` gate has a concrete home
 * (`PLATFORM_ADMIN_GATE_HOMES`, `non.admin.surfaces.ts`), checked PER MEMBER
 * in both directions by `checkPlatformAdminGateHomes` (`source.scan.ts`).
 * The negative cases run the SAME checker against deliberately broken maps,
 * so each one proves a class of drift the check actually catches.
 */
describe('PLATFORM_ADMIN gate homes (QA cross-census-3, census check 3)', () => {
  const files: ReadonlyMap<string, string> = new Map(
    listSourceFiles().map(file => [
      file,
      readFileSync(join(process.cwd(), file), 'utf-8'),
    ])
  );

  /** The census's own PLATFORM_ADMIN-gated files (A1 actor, A9 conversion)
   * — accounted for by `A_ROW_SURFACES`, exempt from the homes map. */
  const exemptFiles: ReadonlySet<string> = new Set(
    Object.values(A_ROW_SURFACES)
      .flat()
      .filter(
        surface =>
          isRequiresGate(surface.gate) &&
          surface.gate.requires === AuthorizationPrivilege.PLATFORM_ADMIN
      )
      .map(surface => surface.file)
  );

  const USER_MUTATIONS = 'src/domain/community/user/user.resolver.mutations.ts';
  const COMMUNICATION_FIELDS =
    'src/platform-admin/admin/platform.admin.resolver.communication.fields.ts';
  const VC_MUTATIONS =
    'src/domain/community/virtual-contributor/virtual.contributor.resolver.mutations.ts';
  const PLATFORM_ADMIN_FIELDS =
    'src/platform-admin/admin/platform.admin.resolver.fields.ts';

  const check = (
    homes: Readonly<
      Record<string, Readonly<Record<string, PlatformAdminGateHome>>>
    >,
    fileOverrides: Readonly<Record<string, string>> = {}
  ) =>
    checkPlatformAdminGateHomes({
      files: new Map([...files, ...Object.entries(fileOverrides)]),
      homes,
      exemptFiles,
    });

  it('the exemption is exactly the two census-declared PLATFORM_ADMIN files (A1 actor, A9 conversion)', () => {
    expect([...exemptFiles].sort()).toEqual([
      'src/domain/actor/actor/actor.resolver.mutations.ts',
      'src/services/api/conversion/conversion.resolver.mutations.ts',
    ]);
  });

  it('every PLATFORM_ADMIN gate has a home, and every home is still declared AND still gated on PLATFORM_ADMIN — per member', () => {
    expect(check(PLATFORM_ADMIN_GATE_HOMES)).toEqual([]);
  });

  it('no home is a placeholder ("<…>" / "T0xx")', () => {
    for (const [file, members] of Object.entries(PLATFORM_ADMIN_GATE_HOMES)) {
      for (const [member, home] of Object.entries(members)) {
        expect(
          /<|T0xx/i.test(JSON.stringify(home)),
          `${file}#${member} has a placeholder home`
        ).toBe(false);
      }
    }
  });

  it('virtualAssistant is NOT listed — QA C1-13 re-gated it onto PLATFORM_OPERATIONS_ADMIN', () => {
    expect(
      Object.hasOwn(
        PLATFORM_ADMIN_GATE_HOMES[PLATFORM_ADMIN_FIELDS],
        'virtualAssistant'
      )
    ).toBe(false);
    expect(
      gatesOnPlatformAdmin(
        files.get(PLATFORM_ADMIN_FIELDS)!,
        'virtualAssistant'
      )
    ).toBe(false);
  });

  // ---- negative cases: the checker must FAIL each of these ----

  it('negative (a): a member that is only a substring of the file ({communication} on the communication fields file) fails the member-presence check', () => {
    const errors = check({
      ...PLATFORM_ADMIN_GATE_HOMES,
      [COMMUNICATION_FIELDS]: {
        ...PLATFORM_ADMIN_GATE_HOMES[COMMUNICATION_FIELDS],
        communication: { regateBeforeT074: 'wrong file' },
      },
    });
    expect(errors).toEqual([
      expect.stringContaining(
        `${COMMUNICATION_FIELDS}#communication: listed in PLATFORM_ADMIN_GATE_HOMES but is not DECLARED`
      ),
    ]);
  });

  it('negative (b): removing a gate file (user.resolver.mutations.ts) fails and names that file', () => {
    const { [USER_MUTATIONS]: _removed, ...withoutUserMutations } =
      PLATFORM_ADMIN_GATE_HOMES;
    const errors = check(withoutUserMutations);
    expect(errors).toEqual([
      expect.stringContaining(
        `${USER_MUTATIONS}: gates on PLATFORM_ADMIN but has no PLATFORM_ADMIN_GATE_HOMES entry`
      ),
    ]);
  });

  it('negative (c): a declared member that exists but does NOT gate on PLATFORM_ADMIN ({deleteVirtualContributor}) fails', () => {
    const errors = check({
      ...PLATFORM_ADMIN_GATE_HOMES,
      [VC_MUTATIONS]: {
        ...PLATFORM_ADMIN_GATE_HOMES[VC_MUTATIONS],
        deleteVirtualContributor: { regateBeforeT074: 'not a gate' },
      },
    });
    expect(errors).toEqual([
      expect.stringContaining(
        `${VC_MUTATIONS}#deleteVirtualContributor: listed in PLATFORM_ADMIN_GATE_HOMES but its own segment no longer names PLATFORM_ADMIN`
      ),
    ]);
  });

  it('negative (d): re-listing virtualAssistant (re-gated by C1-13, the rest of the file still on PLATFORM_ADMIN) fails the per-member stale check', () => {
    const errors = check({
      ...PLATFORM_ADMIN_GATE_HOMES,
      [PLATFORM_ADMIN_FIELDS]: {
        ...PLATFORM_ADMIN_GATE_HOMES[PLATFORM_ADMIN_FIELDS],
        virtualAssistant: { regateBeforeT074: 'stale' },
      },
    });
    expect(errors).toEqual([
      expect.stringContaining(
        `${PLATFORM_ADMIN_FIELDS}#virtualAssistant: listed in PLATFORM_ADMIN_GATE_HOMES but its own segment no longer names PLATFORM_ADMIN`
      ),
    ]);
  });

  it('negative (e): a listed member that is only CALLED in the file, no longer declared, fails', () => {
    const errors = check(PLATFORM_ADMIN_GATE_HOMES, {
      [USER_MUTATIONS]: [
        'export class X {',
        '  async other() {',
        '    this.grantAccessOrFail(a, b, AuthorizationPrivilege.PLATFORM_ADMIN);',
        '    return this.updateUserPlatformSettings();',
        '  }',
        '}',
      ].join('\n'),
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `${USER_MUTATIONS}#updateUserPlatformSettings: listed in PLATFORM_ADMIN_GATE_HOMES but is not DECLARED`
        ),
        expect.stringContaining(
          `${USER_MUTATIONS}#other: gates on PLATFORM_ADMIN but is not listed`
        ),
      ])
    );
  });

  it('negative (f): a NEW PLATFORM_ADMIN-gated member in an already-homed file fails completeness', () => {
    const content = files.get(USER_MUTATIONS)!;
    const withNewGate = content.replace(
      /\n\}\s*$/,
      [
        '',
        '  async brandNewAdminMutation() {',
        '    this.authorizationService.grantAccessOrFail(a, b, AuthorizationPrivilege.PLATFORM_ADMIN, "x");',
        '  }',
        '}',
        '',
      ].join('\n')
    );
    const errors = check(PLATFORM_ADMIN_GATE_HOMES, {
      [USER_MUTATIONS]: withNewGate,
    });
    expect(errors).toEqual([
      expect.stringContaining(
        `${USER_MUTATIONS}#brandNewAdminMutation: gates on PLATFORM_ADMIN but is not listed`
      ),
    ]);
  });

  it('negative (g): a replacedBy privilege the member does not actually check fails', () => {
    const errors = check({
      ...PLATFORM_ADMIN_GATE_HOMES,
      [PLATFORM_ADMIN_FIELDS]: {
        ...PLATFORM_ADMIN_GATE_HOMES[PLATFORM_ADMIN_FIELDS],
        accounts: { replacedBy: [AuthorizationPrivilege.PLATFORM_USERS_ADMIN] },
      },
    });
    expect(errors).toEqual([
      expect.stringContaining(
        `${PLATFORM_ADMIN_FIELDS}#accounts: replacedBy ${AuthorizationPrivilege.PLATFORM_USERS_ADMIN} is not a replacement privilege`
      ),
    ]);
  });

  it('negative (h): a placeholder home fails', () => {
    const errors = check({
      ...PLATFORM_ADMIN_GATE_HOMES,
      [USER_MUTATIONS]: {
        updateUserPlatformSettings: { regateBeforeT074: '<Slice B task>' },
      },
    });
    expect(errors).toEqual([
      expect.stringContaining(
        `${USER_MUTATIONS}#updateUserPlatformSettings: home`
      ),
    ]);
  });
});
