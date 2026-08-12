import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  A_ROW_GATE_COVERAGE,
  ARowGateCoverageEntry,
  ASSIGNMENT_RULE_COVERAGE,
  AUDIT_WRITER_COVERAGE,
  AuditWriterCoverageEntry,
  MECHANISM_COVERAGE,
  MechanismCoverageEntry,
  PRIVILEGE_COVERAGE,
  PRIVILEGE_KEY_BY_VALUE,
  PrivilegeCoverageEntry,
  STATEFUL_FLOW_COVERAGE,
} from './unit.coverage.inventory';

/**
 * 027-platform-role-redesign (T070b, SC-018) — for EVERY declared path in
 * ALL SIX of `unit.coverage.inventory.ts`'s Records, assert the file
 * exists, is non-empty and ends `.spec.ts`. A renamed or deleted spec fails
 * HERE; a *missing entry* already failed at `tsc` (the Record's key type is
 * exhaustive). Not a self-registering runtime registry — `isolate: false`
 * plus a shared module cache makes cross-file registry state unreliable,
 * and a registry can only observe specs that RAN, so a filtered run would
 * report false completeness (research C13).
 */
function assertRealSpec(path: string): void {
  const absolute = resolve(process.cwd(), path);
  expect(existsSync(absolute), `spec path does not exist: ${path}`).toBe(true);
  expect(path.endsWith('.spec.ts'), `not a .spec.ts file: ${path}`).toBe(true);
  expect(
    statSync(absolute).size,
    `spec file is empty: ${path}`
  ).toBeGreaterThan(0);
}

/** qual-server-10 fix: `assertRealSpec` plus a cheap whole-file text scan —
 * the declared spec's content MUST mention `token` (e.g. the privilege's
 * enum KEY name) or the entry is mis-pointed: a real, non-empty `.spec.ts`
 * file that happens to cover something else entirely, which
 * `assertRealSpec` alone cannot distinguish from genuine coverage. */
function assertRealSpecCovers(path: string, token: string): void {
  assertRealSpec(path);
  const content = readFileSync(resolve(process.cwd(), path), 'utf-8');
  expect(
    content.includes(token),
    `spec ${path} does not mention '${token}' — declared coverage looks mis-pointed`
  ).toBe(true);
}

describe('unit.coverage.inventory (T070b — path existence)', () => {
  describe('ASSIGNMENT_RULE_COVERAGE', () => {
    for (const [ruleId, entry] of Object.entries(ASSIGNMENT_RULE_COVERAGE)) {
      it(`${ruleId}: permittedSpec/deniedSpec/orderSpec exist`, () => {
        assertRealSpec(entry.permittedSpec);
        assertRealSpec(entry.deniedSpec);
        assertRealSpec(entry.orderSpec);
      });
    }
  });

  describe('AUDIT_WRITER_COVERAGE', () => {
    for (const [category, entry] of Object.entries(AUDIT_WRITER_COVERAGE) as [
      string,
      AuditWriterCoverageEntry,
    ][]) {
      it(`${category}: declared spec(s) exist`, () => {
        if ('owner' in entry) {
          assertRealSpec(entry.spec);
        } else {
          assertRealSpec(entry.writeSucceedsSpec);
          assertRealSpec(entry.writeFailsSpec);
        }
      });
    }
  });

  describe('A_ROW_GATE_COVERAGE', () => {
    for (const [aRow, entry] of Object.entries(A_ROW_GATE_COVERAGE) as [
      string,
      ARowGateCoverageEntry,
    ][]) {
      it(`${aRow}: every declared gateSpecs entry exists (walks the WHOLE array, not just the first)`, () => {
        if ('gateSpecs' in entry) {
          expect(entry.gateSpecs.length).toBeGreaterThan(0);
          for (const spec of entry.gateSpecs) {
            assertRealSpec(spec);
          }
        } else {
          // {retired: true} (A18) or {deferred: 'B'} (A17) — nothing to
          // check yet; this row's spec does not exist until the slice that
          // creates its surface.
          expect(
            'retired' in entry ||
              ('deferred' in entry && entry.deferred === 'B')
          ).toBe(true);
        }
      });
    }
  });

  describe('PRIVILEGE_COVERAGE', () => {
    for (const [privilege, entry] of Object.entries(PRIVILEGE_COVERAGE) as [
      string,
      PrivilegeCoverageEntry,
    ][]) {
      it(`${privilege}: declared spec(s) exist and actually mention the privilege (qual-server-10)`, () => {
        if ('deferred' in entry) {
          expect(entry.deferred).toBe('B');
        } else {
          const token = PRIVILEGE_KEY_BY_VALUE[privilege] ?? privilege;
          assertRealSpecCovers(entry.ruleSpec, token);
          assertRealSpecCovers(entry.grantSetSpec, token);
        }
      });
    }
  });

  describe('STATEFUL_FLOW_COVERAGE', () => {
    for (const [flow, entry] of Object.entries(STATEFUL_FLOW_COVERAGE)) {
      it(`${flow}: covering spec exists`, () => {
        assertRealSpec(entry.spec);
        expect(entry.drillStep.length).toBeGreaterThan(0);
      });
    }
  });

  // 027-platform-role-redesign (spec-server-20 fix): closes the FR-033
  // inventory gap — the role→credential map, the organization-inheritance
  // prefix filter and its cache invalidation, and two of the four bootstrap
  // seeding paths previously had no entry in ANY of the five prior Records,
  // so deleting their covering spec failed no build.
  describe('MECHANISM_COVERAGE', () => {
    for (const [mechanism, entry] of Object.entries(MECHANISM_COVERAGE) as [
      string,
      MechanismCoverageEntry,
    ][]) {
      it(`${mechanism}: covering spec exists`, () => {
        assertRealSpec(entry.spec);
      });
    }
  });
});
