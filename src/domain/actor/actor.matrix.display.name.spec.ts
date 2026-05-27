import { describe, expect, it } from 'vitest';
import { IActor } from './actor/actor.interface';
import { getMatrixDisplayName } from './actor.matrix.display.name';

describe('getMatrixDisplayName', () => {
  const makeActor = (
    profileDisplayName: string | undefined,
    nameID: string
  ): IActor =>
    ({
      profile:
        profileDisplayName !== undefined
          ? ({ displayName: profileDisplayName } as any)
          : undefined,
      nameID,
    }) as any;

  it('returns trimmed profile.displayName when populated', () => {
    expect(getMatrixDisplayName(makeActor('Jane Doe', 'jane-doe'))).toBe(
      'Jane Doe'
    );
    expect(getMatrixDisplayName(makeActor('  Jane Doe  ', 'jane-doe'))).toBe(
      'Jane Doe'
    );
  });

  it('falls back to nameID when profile.displayName is whitespace-only', () => {
    expect(getMatrixDisplayName(makeActor('   ', 'jane-doe'))).toBe('jane-doe');
  });

  it('falls back to nameID when profile.displayName is empty string', () => {
    expect(getMatrixDisplayName(makeActor('', 'jane-doe'))).toBe('jane-doe');
  });

  it('falls back to nameID when profile is undefined', () => {
    expect(getMatrixDisplayName(makeActor(undefined, 'jane-doe'))).toBe(
      'jane-doe'
    );
  });

  it('returns nameID empty string when both are empty (defensive — not reachable in production given PG NOT NULL constraints)', () => {
    expect(getMatrixDisplayName(makeActor(undefined, ''))).toBe('');
  });
});
