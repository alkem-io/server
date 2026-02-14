import { stringifyWithoutAuthorizationMetaInfo } from './stringify.util';

describe('stringifyWithoutAuthorizationMetaInfo', () => {
  const filteredKeys = [
    'credentials',
    'authorization',
    'createdDate',
    'updatedDate',
    'version',
    'allowedTypes',
    'storageBucket',
    'visuals',
    'issuer',
    'expires',
  ] as const;

  it.each(filteredKeys.map(key => ({ key })))(
    'should exclude the "$key" key from the output',
    ({ key }) => {
      const input = { id: '1', name: 'test', [key]: 'secret-value' };
      const result = JSON.parse(
        stringifyWithoutAuthorizationMetaInfo(input)
      );
      expect(result).not.toHaveProperty(key);
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('name', 'test');
    }
  );

  it('should preserve non-filtered keys', () => {
    const input = {
      id: '123',
      name: 'Test',
      description: 'A description',
      count: 42,
    };
    const result = JSON.parse(stringifyWithoutAuthorizationMetaInfo(input));
    expect(result).toEqual(input);
  });

  it('should exclude multiple filtered keys at once', () => {
    const input = {
      id: '1',
      credentials: ['admin'],
      authorization: { role: 'admin' },
      createdDate: '2024-01-01',
      updatedDate: '2024-06-01',
      version: 2,
      name: 'keep-me',
    };
    const result = JSON.parse(stringifyWithoutAuthorizationMetaInfo(input));
    expect(result).toEqual({ id: '1', name: 'keep-me' });
  });

  it('should handle nested objects with filtered keys', () => {
    const input = {
      user: {
        id: '1',
        credentials: 'should-be-removed',
        profile: { name: 'Alice' },
      },
    };
    const result = JSON.parse(stringifyWithoutAuthorizationMetaInfo(input));
    expect(result.user).not.toHaveProperty('credentials');
    expect(result.user.profile).toEqual({ name: 'Alice' });
  });

  it('should handle empty objects', () => {
    expect(stringifyWithoutAuthorizationMetaInfo({})).toBe('{}');
  });

  it('should handle arrays', () => {
    const input = [
      { id: 1, credentials: 'remove' },
      { id: 2, authorization: 'remove' },
    ];
    const result = JSON.parse(stringifyWithoutAuthorizationMetaInfo(input));
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should handle null values', () => {
    expect(stringifyWithoutAuthorizationMetaInfo(null)).toBe('null');
  });

  it('should handle primitive values', () => {
    expect(stringifyWithoutAuthorizationMetaInfo('hello')).toBe('"hello"');
    expect(stringifyWithoutAuthorizationMetaInfo(42)).toBe('42');
  });
});
