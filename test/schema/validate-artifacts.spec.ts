import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

// Minimal happy-path validation test using small synthetic artifacts

describe('artifact JSON schema validation', () => {
  const report = path.resolve('tmp-change-report.json');
  const deps = path.resolve('tmp-deprecations.json');

  beforeAll(() => {
    writeFileSync(
      report,
      JSON.stringify(
        {
          snapshotId: 'abcd1234',
          baseSnapshotId: null,
          generatedAt: new Date().toISOString(),
          classifications: {
            additive: 0,
            deprecated: 0,
            breaking: 0,
            prematureRemoval: 0,
            invalidDeprecation: 0,
            deprecationGrace: 0,
            info: 0,
          },
          entries: [],
          overrideApplied: false,
        },
        null,
        2
      )
    );
    writeFileSync(
      deps,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          entries: [],
        },
        null,
        2
      )
    );
  });

  it('validates minimal artifacts', () => {
    execSync(
      'node -r ts-node/register src/tools/schema/validate-artifacts.ts ' +
        report +
        ' ' +
        deps,
      { stdio: 'inherit' }
    );
  });
});
