import { buildDeprecationRegistry } from '@src/schema-contract/deprecation/registry';

describe('schema-contract: deprecation registry', () => {
  it('builds registry with ISO timestamp and preserves entries', () => {
    const entries: any[] = [
      { element: 'Type.field', removeAfter: '2099-01-01', reason: 'Test' },
    ];
    const artifact = buildDeprecationRegistry(entries as any);
    expect(artifact.entries).toBe(entries);
    // Basic ISO 8601 format check
    expect(artifact.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T.+Z/);
  });
});
