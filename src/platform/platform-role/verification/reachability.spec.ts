import type { AuthorizationCredential } from '@common/enums/authorization.credential';
import { A_ROW_SURFACES, type SurfaceRef } from './a.row.surfaces';
import { reachers } from './reachability';

/**
 * THE check that closes the defect class four review findings kept
 * re-opening: for EVERY surface in `A_ROW_SURFACES`, the DERIVED reacher set
 * (`reachers()`, from the gate + grant/cascade model) must equal the
 * DECLARED intent (`intendedOwners ∪ acceptedExtraReachers`). Set EQUALITY,
 * not containment — a superset is a two-family overlap, a subset is a role
 * denied its own family, and only equality catches both.
 *
 * A failing assertion here is a finding about the POLICY or the CENSUS,
 * NEVER a stale expectation to relax. Every historic
 * instance (A15 forum, A6 delete-org, A7 packs, A16 read, A17 owner) was a
 * real defect that this file's absence let ship.
 */

function credentialSet(
  credentials: readonly AuthorizationCredential[]
): Set<AuthorizationCredential> {
  return new Set(credentials);
}

function symmetricDifference(
  actual: Set<AuthorizationCredential>,
  expected: Set<AuthorizationCredential>
): { extra: AuthorizationCredential[]; missing: AuthorizationCredential[] } {
  const extra = [...actual].filter(c => !expected.has(c));
  const missing = [...expected].filter(c => !actual.has(c));
  return { extra, missing };
}

function expectedReachers(surface: SurfaceRef): Set<AuthorizationCredential> {
  return new Set<AuthorizationCredential>([
    ...surface.intendedOwners,
    ...(surface.acceptedExtraReachers?.map(r => r.credential) ?? []),
  ]);
}

function surfaceLabel(aRow: string, surface: SurfaceRef): string {
  return `${aRow}/${surface.file}#${surface.member}`;
}

function assertReachabilityEquals(aRow: string, surface: SurfaceRef): void {
  const actual = credentialSet(reachers(surface));
  const expected = expectedReachers(surface);
  const { extra, missing } = symmetricDifference(actual, expected);
  const label = surfaceLabel(aRow, surface);

  if (extra.length > 0 || missing.length > 0) {
    const parts: string[] = [];
    if (extra.length > 0) {
      parts.push(`unexpected reacher(s) [${extra.join(', ')}]`);
    }
    if (missing.length > 0) {
      parts.push(`missing reacher(s) [${missing.join(', ')}]`);
    }
    throw new Error(
      `${label}: ${parts.join('; ')} (derived=[${[...actual].join(', ')}], declared=[${[...expected].join(', ')}])`
    );
  }
}

describe('reachability.spec.ts (T070m, FR-034/SC-019)', () => {
  const aRowIds = Object.keys(
    A_ROW_SURFACES
  ) as (keyof typeof A_ROW_SURFACES)[];

  for (const aRow of aRowIds) {
    const surfaces = A_ROW_SURFACES[aRow];

    describe(aRow, () => {
      if (surfaces.length === 0) {
        it('A18 — retired, no surfaces to check', () => {
          expect(surfaces).toHaveLength(0);
        });
        return;
      }

      surfaces.forEach((surface, index) => {
        const label = `${surfaceLabel(aRow, surface)}${surfaces.length > 1 ? ` [${index}]` : ''}`;

        it(`${label} — derived ≡ intendedOwners ∪ acceptedExtraReachers`, () => {
          assertReachabilityEquals(aRow, surface);
        });
      });
    });
  }

  // ---------------------------------------------------------------------
  // Three declarations that LOOK wrong to a reader and are correct —
  // asserted explicitly so a future "fix" gets a failing spec, not a
  // plausible-looking edit (research D26, T070m's own instruction).
  // ---------------------------------------------------------------------

  it('A16: the accepted extra reacher (platform-content-full-access) is present BY DESIGN, not a defect', () => {
    const surface = A_ROW_SURFACES.A16[0];
    const derived = new Set(reachers(surface));
    expect(
      derived.has(
        surface.acceptedExtraReachers?.[0]
          ?.credential as AuthorizationCredential
      )
    ).toBe(true);
    // Still equal to the FULL declared set, extra reacher included.
    assertReachabilityEquals('A16', surface);
  });

  it('A17: EMPTY intent derives to ZERO reachers — owned by the entity admin, no global role', () => {
    for (const surface of A_ROW_SURFACES.A17) {
      expect(surface.intendedOwners).toHaveLength(0);
      expect(reachers(surface)).toHaveLength(0);
    }
  });

  // ---------------------------------------------------------------------
  // T070l(d) mutation-test evidence lives in this file's own git history —
  // see docs/evidence/027-platform-role-redesign.md for the four recorded
  // failure outputs (perturb ROOT_CASCADE, drop an intendedOwners entry,
  // delete A16's acceptedExtraReachers — each must fail THIS spec).
  // ---------------------------------------------------------------------
});
