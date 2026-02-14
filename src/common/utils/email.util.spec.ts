import {
  splitEmail,
  getEmailName,
  getEmailDomain,
  validateEmail,
} from './email.util';

describe('splitEmail', () => {
  it('should split a standard email into name and domain', () => {
    expect(splitEmail('user@example.com')).toEqual({
      name: 'user',
      domain: 'example.com',
    });
  });

  it('should handle email with subdomain', () => {
    expect(splitEmail('admin@mail.example.co.uk')).toEqual({
      name: 'admin',
      domain: 'mail.example.co.uk',
    });
  });

  it('should handle email with plus addressing', () => {
    expect(splitEmail('user+tag@example.com')).toEqual({
      name: 'user+tag',
      domain: 'example.com',
    });
  });

  it('should throw when email has no @ separator', () => {
    expect(() => splitEmail('noemailhere')).toThrow(
      'Email does not include "@" separator'
    );
  });

  it('should throw for an empty string', () => {
    expect(() => splitEmail('')).toThrow(
      'Email does not include "@" separator'
    );
  });

  it('should handle email with @ at boundaries', () => {
    const result = splitEmail('@domain.com');
    expect(result).toEqual({ name: '', domain: 'domain.com' });
  });
});

describe('getEmailName', () => {
  it('should return the name portion of an email', () => {
    expect(getEmailName('john@example.com')).toBe('john');
  });

  it('should throw for invalid email without @', () => {
    expect(() => getEmailName('invalid')).toThrow();
  });
});

describe('getEmailDomain', () => {
  it('should return the domain portion of an email', () => {
    expect(getEmailDomain('john@example.com')).toBe('example.com');
  });

  it('should throw for invalid email without @', () => {
    expect(() => getEmailDomain('invalid')).toThrow();
  });
});

describe('validateEmail', () => {
  it.each([
    { email: 'user@example.com', expected: true },
    { email: 'admin@mail.example.co.uk', expected: true },
    { email: 'user+tag@example.com', expected: true },
    { email: 'a@b.c', expected: true },
  ])('should return true for valid email: $email', ({ email, expected }) => {
    expect(validateEmail(email)).toBe(expected);
  });

  it.each([
    { email: '', description: 'empty string' },
    { email: 'noatsign', description: 'no @ sign' },
    { email: 'user@', description: 'missing domain' },
    { email: '@domain', description: 'missing name' },
    { email: 'user@domain', description: 'no TLD dot' },
  ])(
    'should return false for $description',
    ({ email }) => {
      expect(validateEmail(email)).toBe(false);
    }
  );
});
