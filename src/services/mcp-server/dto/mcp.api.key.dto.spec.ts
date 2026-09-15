import { describe, expect, it } from 'vitest';
import {
  McpApiKeyOperation,
  McpApiKeyStatus,
  toGraphqlMcpApiKey,
} from './mcp.api.key.dto';

/**
 * workspace#038 — projection robustness (FR-008/FR-032).
 *
 * `me.mcpApiKeys` is `[McpApiKey!]!`, so ONE row that throws or produces an
 * unrepresentable enum value fails the whole field. The user then loses sight
 * of every key on the only surface that can revoke them. These tests pin the
 * degradation behaviour for rows this feature did not write — the bootstrap
 * trust-anchor path and the manual-database-insert path the spec documents.
 */
const baseRow = {
  id: 'key-1',
  name: 'Legacy key',
  createdDate: new Date('2026-01-01T00:00:00Z'),
  isActive: true,
} as const;

describe('toGraphqlMcpApiKey — legacy row degradation', () => {
  it('projects a well-formed row', () => {
    const result = toGraphqlMcpApiKey({
      ...baseRow,
      scopes: [{ operations: ['read', 'tools'] }],
    } as any);

    expect(result.operations).toEqual([
      McpApiKeyOperation.READ,
      McpApiKeyOperation.TOOLS,
    ]);
    expect(result.status).toBe(McpApiKeyStatus.ACTIVE);
  });

  // The `scopes` column is jsonb NOT NULL, but that constrains SQL NULL only:
  // JSON `null` and JSON objects are both accepted by the column and arrive in
  // JS as values with no `.flatMap`. Verified against the live column.
  it.each([
    ['JSON null', null],
    ['undefined', undefined],
    ['a non-array object', { operations: ['read'] }],
    ['a string', 'read'],
  ])('does not throw when scopes is %s', (_label, scopes) => {
    const call = () => toGraphqlMcpApiKey({ ...baseRow, scopes } as any);

    expect(call).not.toThrow();
    expect(call().operations).toEqual([]);
    // Still listable, still revocable — that is the whole point.
    expect(call().id).toBe('key-1');
    expect(call().status).toBe(McpApiKeyStatus.ACTIVE);
  });

  it('drops operations outside the published enum instead of failing the field', () => {
    const result = toGraphqlMcpApiKey({
      ...baseRow,
      scopes: [{ operations: ['read', 'write', 'admin'] }],
    } as any);

    expect(result.operations).toEqual([McpApiKeyOperation.READ]);
  });

  it('survives a scope entry with no operations key, and a null entry', () => {
    const result = toGraphqlMcpApiKey({
      ...baseRow,
      scopes: [{ spaceIds: ['s1'] }, null, { operations: ['tools'] }],
    } as any);

    expect(result.operations).toEqual([McpApiKeyOperation.TOOLS]);
  });

  it('derives REVOKED ahead of EXPIRED (FR-032)', () => {
    const result = toGraphqlMcpApiKey({
      ...baseRow,
      isActive: false,
      expiresAt: new Date('2020-01-01T00:00:00Z'),
      scopes: [{ operations: ['read'] }],
    } as any);

    expect(result.status).toBe(McpApiKeyStatus.REVOKED);
  });
});
