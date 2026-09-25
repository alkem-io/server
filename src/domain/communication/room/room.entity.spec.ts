import { getMetadataArgsStorage } from 'typeorm';
import { Room } from './room.entity';

describe('Room entity', () => {
  it('maps the readiness record onto a NOT NULL jsonb column with the legacy default', () => {
    const column = getMetadataArgsStorage().columns.find(
      c => c.target === Room && c.propertyName === 'readiness'
    );

    expect(column).toBeDefined();
    expect(column?.options.type).toBe('jsonb');
    expect(column?.options.nullable).toBe(false);
    expect(column?.options.default).toEqual(
      expect.objectContaining({
        state: 'UNKNOWN',
        reason: 'LEGACY_UNVERIFIED',
      })
    );
  });
});
