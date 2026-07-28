import type { AuthorizationCredential } from '@common/enums/authorization.credential';
import { A_ROW_SURFACES, type SurfaceRef } from './a.row.surfaces';
import { reachers } from './reachability';

/**
 * 027-platform-role-redesign (T070m, FR-034/SC-019, research D26) — THE
 * check that closes the defect class four review findings kept re-opening:
 * for EVERY surface in `A_ROW_SURFACES`, in BOTH slices, the DERIVED
 * reacher set (`reachers()`, from the gate + grant/cascade model) must
 * equal the DECLARED intent (`intendedOwners ∪ acceptedExtraReachers`, plus
 * `legacyReachers` in Slice A). Set EQUALITY, not containment — a superset
 * is the two-family overlap SC-004 forbids, a subset is a role denied its
 * own family, and only equality catches both.
 *
 * A failing assertion here is a finding about the POLICY or the CENSUS,
 * NEVER a stale expectation to relax (research D26). Every historic
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

function expectedForSlice(
  surface: SurfaceRef,
  slice: 'A' | 'B'
): Set<AuthorizationCredential> {
  const base = new Set<AuthorizationCredential>([
    ...surface.intendedOwners,
    ...(surface.acceptedExtraReachers?.map(r => r.credential) ?? []),
  ]);
  if (slice === 'A') {
    for (const c of surface.legacyReachers) base.add(c);
  }
  return base;
}

function isLiveInSlice(surface: SurfaceRef, slice: 'A' | 'B'): boolean {
  if (surface.lifecycle === 'retired') return false;
  if (
    surface.lifecycle &&
    typeof surface.lifecycle === 'object' &&
    'deferred' in surface.lifecycle
  ) {
    // {deferred: 'B'} — absent at A, live at B.
    return slice === 'B';
  }
  if (
    surface.lifecycle &&
    typeof surface.lifecycle === 'object' &&
    'retiredIn' in surface.lifecycle
  ) {
    // {retiredIn: 'B'} — live at A, gone at B.
    return slice === 'A';
  }
  return true;
}

function surfaceLabel(aRow: string, surface: SurfaceRef): string {
  const member =
    typeof surface.member === 'string'
      ? surface.member
      : JSON.stringify(surface.member);
  return `${aRow}/${surface.file}#${member}`;
}

function assertReachabilityEquals(
  aRow: string,
  surface: SurfaceRef,
  slice: 'A' | 'B'
): void {
  const actual = credentialSet(reachers(surface, slice));
  const expected = expectedForSlice(surface, slice);
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
      `${label} slice ${slice}: ${parts.join('; ')} (derived=[${[...actual].join(', ')}], declared=[${[...expected].join(', ')}])`
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
        it('A18 — retired in both slices, no surfaces to check', () => {
          expect(surfaces).toHaveLength(0);
        });
        return;
      }

      surfaces.forEach((surface, index) => {
        const label = `${surfaceLabel(aRow, surface)}${surfaces.length > 1 ? ` [${index}]` : ''}`;

        it(`${label} — Slice B: derived ≡ intendedOwners ∪ acceptedExtraReachers`, () => {
          if (!isLiveInSlice(surface, 'B')) {
            return; // {retiredIn:'B'} — gone at B, nothing to check.
          }
          assertReachabilityEquals(aRow, surface, 'B');
        });

        it(`${label} — Slice A: derived ≡ intendedOwners ∪ acceptedExtraReachers ∪ legacyReachers`, () => {
          if (!isLiveInSlice(surface, 'A')) {
            return; // {deferred:'B'} — not live yet at A.
          }
          assertReachabilityEquals(aRow, surface, 'A');
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
    const derived = new Set(reachers(surface, 'B'));
    expect(
      derived.has(
        surface.acceptedExtraReachers?.[0]
          ?.credential as AuthorizationCredential
      )
    ).toBe(true);
    // Still equal to the FULL declared set, extra reacher included.
    assertReachabilityEquals('A16', surface, 'B');
  });

  it('A17: EMPTY intent derives to ZERO reachers at Slice B — owned by the entity admin, no global role', () => {
    for (const surface of A_ROW_SURFACES.A17) {
      expect(surface.intendedOwners).toHaveLength(0);
      expect(reachers(surface, 'B')).toHaveLength(0);
    }
  });

  it("A1's four FR-022 credential mutations: Slice A derived set is EXACTLY {global-admin} — the pin holding, not the widening leaking through", () => {
    const pinnedSurfaces = A_ROW_SURFACES.A1.filter(
      s =>
        s.lifecycle &&
        typeof s.lifecycle === 'object' &&
        'retiredIn' in s.lifecycle
    );
    expect(pinnedSurfaces).toHaveLength(4);
    for (const surface of pinnedSurfaces) {
      const derived = reachers(surface, 'A');
      expect(derived).toEqual(surface.legacyReachers);
      expect(derived).toHaveLength(1);
    }
  });

  // ---------------------------------------------------------------------
  // T070l(d) mutation-test evidence lives in this file's own git history —
  // see docs/evidence/027-platform-role-redesign.md for the four recorded
  // failure outputs (perturb ROOT_CASCADE, drop an intendedOwners entry,
  // delete A16's acceptedExtraReachers — each must fail THIS spec).
  // ---------------------------------------------------------------------
});
