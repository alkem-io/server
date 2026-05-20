import { normalizeName } from './normalize-name';

/**
 * 004 T039 — unit test for `normalize-name.ts` (created in T027).
 *
 * Asserts the Clarifications Session 2026-05-18 invariant: a
 * service-client name is globally unique after whitespace trim +
 * Unicode-default case-fold. Three inputs that the spec calls out as
 * "must collide" should normalise to the same key.
 */
describe('normalizeName', () => {
  it('collapses casing differences', () => {
    expect(normalizeName('Analytics-Pipeline')).toEqual(
      normalizeName('analytics-pipeline')
    );
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeName('  analytics-pipeline  ')).toEqual(
      normalizeName('analytics-pipeline')
    );
  });

  it('trim + case-fold combine to a single canonical key', () => {
    const a = normalizeName('Analytics-Pipeline');
    const b = normalizeName('analytics-pipeline');
    const c = normalizeName('  analytics-pipeline  ');
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });
});
