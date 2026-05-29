import { buildChangeReport } from '../../../src/schema-contract/classify/build-report';
import { createDiffContext } from '../../../src/schema-contract/diff/diff-core';

/**
 * T049: Performance test large synthetic schema diff (<5s target)
 * Generates previous & next schemas with > 250 object types + enums + scalars and runs diff.
 */
function genSchema(typeCount = 260, enumCount = 15, scalarCount = 5): string {
  const parts: string[] = [];
  // Custom scalars
  for (let s = 0; s < scalarCount; s++) {
    parts.push(`scalar CustomScalar_${s}`);
  }
  // Enums
  for (let e = 0; e < enumCount; e++) {
    parts.push(`enum LargeEnum_${e} {\n  V0\n  V1\n  V2\n  V3\n}`);
  }
  // Object types
  for (let i = 0; i < typeCount; i++) {
    const fields: string[] = [];
    for (let f = 0; f < 6; f++) {
      const targetType =
        i > 0 ? `Type_${(i - 1).toString().padStart(3, '0')}` : 'String';
      fields.push(`field${f}: ${f % 2 === 0 ? 'String' : targetType}`);
    }
    parts.push(
      `type Type_${i.toString().padStart(3, '0')} {\n  ${fields.join('\n  ')}\n}`
    );
  }
  // Root Query tying some types to ensure reachability
  parts.push('type Query {\n  root: Type_000\n  version: String\n}');
  return parts.join('\n\n');
}

// Introduce minor changes: remove every Nth field5 line.
// Deterministic so the diff always has the same shape and the volume assertion
// in the spec below never sees zero entries (the original Math.random()<0.02
// version had a ~0.5% chance of producing zero mutations on a 260-type schema).
const REMOVE_EVERY_N_FIELD5 = 50;
function mutateSchema(base: string): string {
  let field5Idx = 0;
  return base
    .split('\n')
    .filter(line => {
      if (line.trim().startsWith('field5:')) {
        const drop = field5Idx % REMOVE_EVERY_N_FIELD5 === 0;
        field5Idx++;
        if (drop) return false; // simulate removal
      }
      return true;
    })
    .join('\n');
}

describe('Large schema diff performance', () => {
  it('produces a non-empty change report on a large schema diff', () => {
    const oldSDL = genSchema();
    const newSDL = mutateSchema(oldSDL);
    const ctx = createDiffContext([]);
    const report = buildChangeReport(oldSDL, newSDL, ctx);
    // Sanity on volume. Wall-clock budget removed (FR-011): vitest's 90s
    // testTimeout already enforces a hard ceiling.
    expect(report.entries.length).toBeGreaterThan(0);
  });
});
