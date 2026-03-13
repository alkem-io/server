import { APP_ID } from '@common/constants';
import { APP_ID_PROVIDER, APP_ID_VALUE } from './app.id.provider';

describe('AppIdProvider', () => {
  describe('APP_ID_VALUE', () => {
    it('should be a valid UUID v4 string', () => {
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(APP_ID_VALUE).toMatch(uuidV4Regex);
    });

    it('should be a string', () => {
      expect(typeof APP_ID_VALUE).toBe('string');
    });
  });

  describe('APP_ID_PROVIDER', () => {
    it('should provide the APP_ID token', () => {
      expect(APP_ID_PROVIDER.provide).toBe(APP_ID);
    });

    it('should use APP_ID_VALUE as the value', () => {
      expect(APP_ID_PROVIDER.useValue).toBe(APP_ID_VALUE);
    });

    it('should be a ValueProvider with provide and useValue keys', () => {
      expect(APP_ID_PROVIDER).toHaveProperty('provide');
      expect(APP_ID_PROVIDER).toHaveProperty('useValue');
    });
  });
});
