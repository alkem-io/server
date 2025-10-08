import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

describe('schema diff enum removal lifecycle', () => {
  const tool = 'src/tools/schema/diff-schema.ts';
  it('flags enum value removal without prior deprecation as BREAKING', () => {
    const dir = mkdtempSync(join(tmpdir(), 'enum-diff-'));
    const oldPath = join(dir, 'old.graphql');
    const newPath = join(dir, 'new.graphql');
    const outPath = join(dir, 'report.json');
    const depPath = join(dir, 'deprecations.json');
    writeFileSync(oldPath, 'enum Status { ACTIVE INACTIVE }');
    writeFileSync(newPath, 'enum Status { ACTIVE }');
    execSync(
      `npx ts-node -r tsconfig-paths/register ${tool} --old ${oldPath} --new ${newPath} --out ${outPath} --deprecations ${depPath}`
    );
    const report = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(
      report.entries.some(
        (e: any) =>
          e.detail.includes('without prior deprecation') &&
          e.changeType === 'BREAKING'
      )
    ).toBe(true);
  });
});
