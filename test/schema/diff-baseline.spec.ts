import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('schema diff baseline', () => {
  const tool = 'src/tools/schema/diff-schema.ts';
  it('creates BASELINE entry when no prior snapshot provided', () => {
    const dir = mkdtempSync(join(tmpdir(), 'schema-diff-base-'));
    const newPath = join(dir, 'new.graphql');
    const outPath = join(dir, 'report.json');
    const depPath = join(dir, 'deprecations.json');
    writeFileSync(newPath, 'type Query { ping: String }');
    execSync(
      `npx ts-node -r tsconfig-paths/register ${tool} --new ${newPath} --out ${outPath} --deprecations ${depPath}`
    );
    const report = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(report.entries[0].changeType).toBe('BASELINE');
  });
});
