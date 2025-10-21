import { createDiffContext } from '../../../src/schema-contract/diff/diff-core';
import { buildChangeReport } from '../../../src/schema-contract/classify/build-report';
import { applyOverrides } from '../../../src/schema-contract/governance/apply-overrides';
import { ChangeType } from '../../../src/schema-contract/model';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * T048: Integration test override approved scenario.
 * Simulates a BREAKING removal and then applies override where a CODEOWNER review contains BREAKING-APPROVED.
 */
function oldSDL(): string {
  return 'type Query {\n  hello: String\n  other: String\n}';
}
function newSDL(): string {
  return 'type Query {\n  other: String\n}';
}

describe('Override governance integration', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-override-'));
  const codeownersPath = path.join(tmpRoot, 'CODEOWNERS');

  beforeAll(() => {
    // Simple CODEOWNERS making @alice an owner of everything
    fs.writeFileSync(codeownersPath, '* @alice\n');
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH = codeownersPath;
    // Provide reviews JSON approving the breaking change
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = JSON.stringify([
      {
        reviewer: 'alice',
        body: 'Looks fine BREAKING-APPROVED',
        state: 'APPROVED',
      },
    ]);
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    delete process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
  });

  it('applies override to breaking entries', () => {
    const ctx = createDiffContext([]);
    const report = buildChangeReport(oldSDL(), newSDL(), ctx);
    // Pre-override sanity: has breaking
    const preBreaking = report.entries.filter(
      e => e.changeType === ChangeType.BREAKING
    );
    expect(preBreaking.length).toBeGreaterThan(0);
    expect(report.overrideApplied).toBeFalsy();

    applyOverrides(report);

    expect(report.overrideApplied).toBe(true);
    // All breaking entries should now have override true
    const postBreaking = report.entries.filter(
      e => e.changeType === ChangeType.BREAKING
    );
    expect(postBreaking.length).toBe(preBreaking.length);
    postBreaking.forEach(be => expect(be.override).toBe(true));
    // Ensure at least the removed field is included
    expect(postBreaking.some(e => e.element === 'Query.hello')).toBe(true);
  });
});
