import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('schema diff nullability', () => {
  const tool = 'src/tools/schema/diff-schema.ts';
  it('classifies nullable -> non-null field change as BREAKING', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nullability-diff-'));
    const oldPath = join(dir, 'old.graphql');
    const newPath = join(dir, 'new.graphql');
    const outPath = join(dir, 'report.json');
    const depPath = join(dir, 'deprecations.json');
    writeFileSync(oldPath, 'type Query { ping: String }');
    writeFileSync(newPath, 'type Query { ping: String! }');
    execSync(
      `npx ts-node -r tsconfig-paths/register ${tool} --old ${oldPath} --new ${newPath} --out ${outPath} --deprecations ${depPath}`
    );
    const report = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(
      report.entries.some(
        (e: any) =>
          e.detail.includes('Field type changed') && e.changeType === 'BREAKING'
      )
    ).toBe(true);
  });
});
