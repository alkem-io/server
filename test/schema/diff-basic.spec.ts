import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// NOTE: Using CLI entry so we exercise the same path as CI script.

describe('schema diff basic', () => {
  const tool = 'src/tools/schema/diff-schema.ts';

  it('classifies added type as ADDITIVE', () => {
    const dir = mkdtempSync(join(tmpdir(), 'schema-diff-'));
    const oldPath = join(dir, 'old.graphql');
    const newPath = join(dir, 'new.graphql');
    const outPath = join(dir, 'report.json');
    const depPath = join(dir, 'deprecations.json');
    writeFileSync(oldPath, 'type Query { ping: String }');
    writeFileSync(
      newPath,
      'type Query { ping: String }\n\ntype Added { id: ID! }'
    );
    execSync(
      `npx ts-node -r tsconfig-paths/register ${tool} --old ${oldPath} --new ${newPath} --out ${outPath} --deprecations ${depPath}`
    );
    const report = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(
      report.entries.some(
        (e: any) =>
          e.detail.includes('Type added: Added') && e.changeType === 'ADDITIVE'
      )
    ).toBe(true);
  });
});
