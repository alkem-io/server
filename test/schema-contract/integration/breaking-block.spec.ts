import { createDiffContext } from '../../../src/schema-contract/diff/diff-core';
import { buildChangeReport } from '../../../src/schema-contract/classify/build-report';
import { ChangeType } from '../../../src/schema-contract/model';

// T047: Integration test intentional breaking change blocked scenario
// Previous schema has two fields; new schema removes one without deprecation => BREAKING.

function sdlOne(): string {
  return 'type Query {\n  hello: String\n  other: String\n}';
}

function sdlTwoRemoved(): string {
  return 'type Query {\n  other: String\n}'; // hello removed
}

describe('Breaking change detection', () => {
  it('identifies removal as BREAKING', () => {
    const ctx = createDiffContext([]);
    const report = buildChangeReport(sdlOne(), sdlTwoRemoved(), ctx);
    const breaking = report.entries.filter(
      e => e.changeType === ChangeType.BREAKING
    );
    expect(breaking.length).toBeGreaterThan(0);
    // Ensure at least one entry references Query.hello
    expect(breaking.some(e => e.element.includes('Query.hello'))).toBe(true);
  });
});
