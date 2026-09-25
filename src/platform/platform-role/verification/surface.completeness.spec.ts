import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSchema, type GraphQLObjectType } from 'graphql';
import { describe, expect, it } from 'vitest';
import { A_ROW_SURFACES } from './a.row.surfaces';
import { NON_ADMIN_SURFACES } from './non.admin.surfaces';

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

  it("every legacy-platform-admin classification's reason names a real, existing file", () => {
    // The FULL agreement check — that the named file is itself a declared
    // `PLATFORM_ADMIN_GATE_HOMES` key that lists this member as one it
    // will re-home — is census check 3, a SEPARATE cross-cutting item this
    // lane does not own and which has not landed yet (no
    // `PLATFORM_ADMIN_GATE_HOMES` export exists anywhere in this repo as of
    // this pass). Until it does, this rule checks the weaker, but still
    // real and regression-catching, structural half: the reason string
    // must NAME an actual file this repo ships, not a made-up or
    // copy-paste-stale path. A reclassification with no real file behind
    // it (or with the file path typo'd) fails here today; the STRONGER
    // membership check is for census check 3 to add once
    // `PLATFORM_ADMIN_GATE_HOMES` exists.
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
