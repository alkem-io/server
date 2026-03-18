import {
  DOMAIN_PATTERN,
  SUBDOMAIN_PATTERN,
  SUBDOMAIN_REGEX,
} from './subdomain.regex';

describe('subdomain.regex', () => {
  describe('SUBDOMAIN_REGEX', () => {
    it('should match valid subdomains', () => {
      expect(SUBDOMAIN_REGEX.test('example')).toBe(true);
      expect(SUBDOMAIN_REGEX.test('my-subdomain')).toBe(true);
      expect(SUBDOMAIN_REGEX.test('a0')).toBe(true);
      expect(SUBDOMAIN_REGEX.test('test123')).toBe(true);
    });

    it('should reject subdomains starting with a digit', () => {
      expect(SUBDOMAIN_REGEX.test('1abc')).toBe(false);
    });

    it('should reject subdomains starting with a hyphen', () => {
      expect(SUBDOMAIN_REGEX.test('-abc')).toBe(false);
    });

    it('should reject subdomains ending with a hyphen', () => {
      expect(SUBDOMAIN_REGEX.test('abc-')).toBe(false);
    });

    it('should reject uppercase characters', () => {
      expect(SUBDOMAIN_REGEX.test('ABC')).toBe(false);
    });

    it('should reject single character subdomains', () => {
      expect(SUBDOMAIN_REGEX.test('a')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(SUBDOMAIN_REGEX.test('')).toBe(false);
    });

    it('should reject strings with special characters', () => {
      expect(SUBDOMAIN_REGEX.test('abc.def')).toBe(false);
      expect(SUBDOMAIN_REGEX.test('abc_def')).toBe(false);
    });

    it('should accept maximum length subdomain (63 chars)', () => {
      const maxLength = 'a' + '0'.repeat(61) + 'b';
      expect(maxLength.length).toBe(63);
      expect(SUBDOMAIN_REGEX.test(maxLength)).toBe(true);
    });

    it('should reject too-long subdomains (64+ chars)', () => {
      const tooLong = 'a' + '0'.repeat(62) + 'b';
      expect(tooLong.length).toBe(64);
      expect(SUBDOMAIN_REGEX.test(tooLong)).toBe(false);
    });
  });

  describe('SUBDOMAIN_PATTERN', () => {
    it('should be a valid regex pattern string', () => {
      expect(() => new RegExp(SUBDOMAIN_PATTERN)).not.toThrow();
    });
  });

  describe('DOMAIN_PATTERN', () => {
    it('should be a valid regex pattern string', () => {
      expect(() => new RegExp(DOMAIN_PATTERN)).not.toThrow();
    });

    it('should match alphanumeric strings with hyphens and underscores', () => {
      const regex = new RegExp(`^${DOMAIN_PATTERN}$`);
      expect(regex.test('example')).toBe(true);
      expect(regex.test('my-domain')).toBe(true);
      expect(regex.test('my_domain')).toBe(true);
      expect(regex.test('Domain123')).toBe(true);
    });
  });
});
