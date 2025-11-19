import {
  splitEmail,
  getEmailName,
  getEmailDomain,
  validateEmail,
  isEmailBlacklisted,
} from './email.util';

describe('Email Utility', () => {
  describe('splitEmail', () => {
    it('should split a valid email into name and domain', () => {
      const result = splitEmail('user@example.com');
      expect(result).toEqual({ name: 'user', domain: 'example.com' });
    });

    it('should throw an error for invalid email without @', () => {
      expect(() => splitEmail('invalid-email')).toThrow(
        'Email does not include "@" separator'
      );
    });
  });

  describe('getEmailName', () => {
    it('should extract the name from email', () => {
      expect(getEmailName('john.doe@example.com')).toBe('john.doe');
    });
  });

  describe('getEmailDomain', () => {
    it('should extract the domain from email', () => {
      expect(getEmailDomain('user@example.com')).toBe('example.com');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@sub.domain.com')).toBe(true);
    });

    it('should reject invalid email format', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('isEmailBlacklisted', () => {
    describe('with blacklisted addresses', () => {
      it('should return true for exact blacklisted email address', () => {
        const blacklistedAddresses = ['spam@example.com', 'test@blocked.com'];
        expect(
          isEmailBlacklisted('spam@example.com', [], blacklistedAddresses)
        ).toBe(true);
      });

      it('should be case-insensitive for email addresses', () => {
        const blacklistedAddresses = ['spam@example.com'];
        expect(
          isEmailBlacklisted('SPAM@EXAMPLE.COM', [], blacklistedAddresses)
        ).toBe(true);
      });

      it('should trim whitespace from email addresses', () => {
        const blacklistedAddresses = ['spam@example.com'];
        expect(
          isEmailBlacklisted(' spam@example.com ', [], blacklistedAddresses)
        ).toBe(true);
      });

      it('should return false for non-blacklisted email address', () => {
        const blacklistedAddresses = ['spam@example.com'];
        expect(
          isEmailBlacklisted('valid@example.com', [], blacklistedAddresses)
        ).toBe(false);
      });
    });

    describe('with blacklisted domains', () => {
      it('should return true for email from blacklisted domain', () => {
        const blacklistedDomains = ['blocked.com', 'spam-domain.org'];
        expect(
          isEmailBlacklisted('user@blocked.com', blacklistedDomains, [])
        ).toBe(true);
      });

      it('should be case-insensitive for domains', () => {
        const blacklistedDomains = ['blocked.com'];
        expect(
          isEmailBlacklisted('user@BLOCKED.COM', blacklistedDomains, [])
        ).toBe(true);
      });

      it('should return false for email from non-blacklisted domain', () => {
        const blacklistedDomains = ['blocked.com'];
        expect(
          isEmailBlacklisted('user@example.com', blacklistedDomains, [])
        ).toBe(false);
      });
    });

    describe('with both blacklisted addresses and domains', () => {
      it('should check both addresses and domains', () => {
        const blacklistedDomains = ['blocked.com'];
        const blacklistedAddresses = ['spam@example.com'];

        expect(
          isEmailBlacklisted(
            'spam@example.com',
            blacklistedDomains,
            blacklistedAddresses
          )
        ).toBe(true);
        expect(
          isEmailBlacklisted(
            'user@blocked.com',
            blacklistedDomains,
            blacklistedAddresses
          )
        ).toBe(true);
        expect(
          isEmailBlacklisted(
            'valid@example.com',
            blacklistedDomains,
            blacklistedAddresses
          )
        ).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false for empty email', () => {
        expect(isEmailBlacklisted('', ['blocked.com'], [])).toBe(false);
      });

      it('should return false with no blacklists', () => {
        expect(isEmailBlacklisted('user@example.com', [], [])).toBe(false);
      });

      it('should handle invalid email format gracefully', () => {
        const blacklistedDomains = ['blocked.com'];
        expect(
          isEmailBlacklisted('invalid-email', blacklistedDomains, [])
        ).toBe(false);
      });
    });
  });
});
