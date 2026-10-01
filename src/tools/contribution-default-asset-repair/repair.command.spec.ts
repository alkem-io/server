import { describe, expect, it } from 'vitest';
import { parseRepairCommand } from './repair.command';

describe('parseRepairCommand', () => {
  it('requires exactly one mode before any bootstrap work', () => {
    expect(() => parseRepairCommand([])).toThrow('usage:');
    expect(() =>
      parseRepairCommand(['--discover', '--apply', 'manifest', '--sha256', 'x'])
    ).toThrow('usage:');
  });

  it('requires each mode to carry its complete local evidence input', () => {
    expect(parseRepairCommand(['--discover', '--manifest', '/tmp/m'])).toEqual({
      mode: 'discover',
      manifestPath: '/tmp/m',
    });
    expect(parseRepairCommand(['--apply', '/tmp/m', '--sha256', 'digest'])).toEqual({
      mode: 'apply',
      manifestPath: '/tmp/m',
      sha256: 'digest',
    });
  });
});
