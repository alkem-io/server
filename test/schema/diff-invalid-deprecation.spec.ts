import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('schema diff invalid deprecation format', () => {
  const tool = 'src/tools/schema/diff-schema.ts';
  it('classifies newly deprecated field with invalid format as INVALID_DEPRECATION_FORMAT', () => {
    const dir = mkdtempSync(join(tmpdir(), 'invalid-dep-'));
    const oldPath = join(dir, 'old.graphql');
    const newPath = join(dir, 'new.graphql');
    const outPath = join(dir, 'report.json');
    const depPath = join(dir, 'deprecations.json');
    writeFileSync(oldPath, 'type Query { ping: String }');
    // Use a reason missing REMOVE_AFTER but simulate future time by running diff after small delay.
    // Parser will treat missing REMOVE_AFTER as grace only if introduced <24h AND we pass introducedAt.
    // In diff tool, introducedAt approximated as now, so to force INVALID_DEPRECATION_FORMAT
    // we supply a malformed reason that still has two parts but wrong prefix to avoid grace path.
    writeFileSync(
      newPath,
      'type Query { ping: String @deprecated(reason: "REMOVEAFTER 2030-01-01 | bad format") }'
    );
    execSync(
      `npx ts-node -r tsconfig-paths/register ${tool} --old ${oldPath} --new ${newPath} --out ${outPath} --deprecations ${depPath}`
    );
    const report = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(
      report.entries.some(
        (e: any) => e.changeType === 'INVALID_DEPRECATION_FORMAT'
      )
    ).toBe(true);
  });
});
