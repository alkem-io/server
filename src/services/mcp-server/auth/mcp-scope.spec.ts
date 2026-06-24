import { McpApiKeyScope } from '../dto/mcp.types';
import { scopeViolation } from './mcp-scope';

describe('scopeViolation', () => {
  it('allows when scopes are undefined (non-key auth; ACL governs)', () => {
    expect(scopeViolation(undefined, 'tools')).toBeUndefined();
  });

  it('fails closed on an explicit empty scope array (authenticated key, no granted operations)', () => {
    expect(scopeViolation([], 'read')).toMatch(/no granted operations/);
    expect(scopeViolation([], 'tools')).toMatch(/no granted operations/);
  });

  it('allows when the required operation is present', () => {
    expect(
      scopeViolation([{ operations: ['read', 'tools'] }], 'tools')
    ).toBeUndefined();
    expect(scopeViolation([{ operations: ['read'] }], 'read')).toBeUndefined();
  });

  it('denies when the required operation is missing', () => {
    expect(scopeViolation([{ operations: ['read'] }], 'tools')).toMatch(
      /lacks the required 'tools' operation/
    );
    expect(scopeViolation([{ operations: ['tools'] }], 'read')).toMatch(
      /lacks the required 'read' operation/
    );
  });

  it('denies when operations are empty', () => {
    expect(scopeViolation([{ operations: [] }], 'read')).toMatch(
      /lacks the required 'read' operation/
    );
  });

  it('aggregates operations across multiple scope entries', () => {
    const scopes: McpApiKeyScope[] = [
      { operations: ['read'] },
      { operations: ['tools'] },
    ];
    expect(scopeViolation(scopes, 'tools')).toBeUndefined();
    expect(scopeViolation(scopes, 'read')).toBeUndefined();
  });

  it('fails closed when spaceIds are set (not yet enforced), even if the operation is allowed', () => {
    expect(
      scopeViolation(
        [{ operations: ['read', 'tools'], spaceIds: ['s1'] }],
        'tools'
      )
    ).toMatch(/restricted to specific spaces/);
  });

  it('ignores an empty spaceIds array (no restriction declared)', () => {
    expect(
      scopeViolation([{ operations: ['tools'], spaceIds: [] }], 'tools')
    ).toBeUndefined();
  });
});
