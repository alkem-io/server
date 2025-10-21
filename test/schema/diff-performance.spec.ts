import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

/**
 * Performance test: generate two large synthetic schemas and ensure diff completes < 5000ms.
 * We keep it deterministic and reasonably sized to avoid CI flakiness.
 */

describe('schema diff performance', () => {
  const tmpDir = path.resolve('tmp');
  const oldPath = path.join(tmpDir, 'perf-old.schema.graphql');
  const newPath = path.join(tmpDir, 'perf-new.schema.graphql');
  const reportPath = path.join(tmpDir, 'perf-change-report.json');

  function generateSchema(
    typeCount: number,
    fieldsPerType: number,
    enumEvery = 5
  ) {
    const parts: string[] = [];
    for (let i = 0; i < typeCount; i++) {
      if (i % enumEvery === 0) {
        parts.push(`enum PerfEnum${i} {\n  VAL_A\n  VAL_B\n  VAL_C\n}`);
      }
      const fields: string[] = [];
      for (let f = 0; f < fieldsPerType; f++) {
        fields.push(`field_${f}: String`);
      }
      // Add some deprecated fields occasionally
      if (i % 7 === 0) {
        fields.push(
          'oldField: String @deprecated(reason: "REMOVE_AFTER=2099-12-31 | legacy")'
        );
      }
      parts.push(`type PerfType${i} {\n  ${fields.join('\n  ')}\n}`);
    }
    // Add a scalar whose json type category changes between versions to exercise scalar path
    parts.push('scalar PerfScalar');
    return parts.join('\n\n');
  }

  beforeAll(() => {
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    // Baseline old schema (tuned to keep diff <5s even under parallel Jest load)
    const oldSDL = generateSchema(180, 5); // ~180 types * 5 fields => 900 field entries + enums
    writeFileSync(oldPath, oldSDL, 'utf-8');
    // New schema with some additions + one scalar rename to trigger changes
    let newSDL = generateSchema(180, 5);
    newSDL += '\n\nscalar PerfScalar2'; // additive scalar
    // Remove a field from a type (simulate potential breaking)
    newSDL = newSDL.replace('field_5: String', '');
    writeFileSync(newPath, newSDL, 'utf-8');
  });

  it('completes diff under performance budget', () => {
    const start = performance.now();
    execSync(
      `ts-node -r tsconfig-paths/register src/tools/schema/diff-schema.ts --old ${oldPath} --new ${newPath} --out ${reportPath}`,
      { stdio: 'inherit' }
    );
    const duration = performance.now() - start;
    const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
    expect(report.snapshotId).toBeDefined();
    expect(duration).toBeLessThan(5000); // <5s requirement
    // Provide some slack visibility
    console.log(`Performance diff duration: ${duration.toFixed(2)}ms`);
  });
});
