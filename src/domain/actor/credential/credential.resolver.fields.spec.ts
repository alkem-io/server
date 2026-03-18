import { CredentialResolverFields } from './credential.resolver.fields';

describe('CredentialResolverFields', () => {
  let resolver: CredentialResolverFields;

  beforeEach(() => {
    resolver = new CredentialResolverFields();
  });

  describe('expires', () => {
    it('should return timestamp in milliseconds when expires is set', async () => {
      const date = new Date('2026-12-31T00:00:00.000Z');
      const credential = { expires: date } as any;

      const result = await resolver.expires(credential);
      expect(result).toBe(date.getTime());
    });

    it('should return null when expires is null', async () => {
      const credential = { expires: null } as any;

      const result = await resolver.expires(credential);
      expect(result).toBeNull();
    });

    it('should return null when expires is undefined', async () => {
      const credential = { expires: undefined } as any;

      const result = await resolver.expires(credential);
      expect(result).toBeNull();
    });

    it('should handle string date values', async () => {
      const credential = { expires: '2026-06-15T12:00:00.000Z' } as any;

      const result = await resolver.expires(credential);
      expect(result).toBe(new Date('2026-06-15T12:00:00.000Z').getTime());
    });
  });
});
