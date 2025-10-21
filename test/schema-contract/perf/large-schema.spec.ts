import { createDiffContext } from '../../../src/schema-contract/diff/diff-core';
import { buildChangeReport } from '../../../src/schema-contract/classify/build-report';

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

// Introduce minor changes: remove a small random subset of field5 lines
function mutateSchema(base: string): string {
  return base
    .split('\n')
    .filter(line => {
      if (line.trim().startsWith('field5:') && Math.random() < 0.02) {
        return false; // simulate removal
      }
      return true;
    })
    .join('\n');
}

describe('Large schema diff performance', () => {
  it('completes diff under 5000ms', () => {
    const oldSDL = genSchema();
    const newSDL = mutateSchema(oldSDL);
    const ctx = createDiffContext([]);
    const start = Date.now();
    const report = buildChangeReport(oldSDL, newSDL, ctx);
    const elapsed = Date.now() - start;
    // Basic sanity on volume
    expect(report.entries.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000); // 5s budget
    console.log(
      `Large schema diff time: ${elapsed}ms, entries: ${report.entries.length}`
    );
  });
});
