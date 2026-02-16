import { ensureMaxLength } from './string.util';

describe('ensureMaxLength', () => {
  describe('with default ellipsis ("...")', () => {
    it.each([
      {
        input: 'Hello, World!',
        maxLength: 8,
        expected: 'Hello...',
        description: 'truncated string with ellipsis',
      },
      {
        input: 'Short',
        maxLength: 10,
        expected: 'Short',
        description: 'string shorter than maxLength',
      },
      {
        input: 'Exact',
        maxLength: 5,
        expected: 'Exact',
        description: 'string exactly at maxLength',
      },
      {
        input: 'TooLong',
        maxLength: 4,
        expected: 'T...',
        description: 'very short maxLength',
      },
    ])('should return $description', ({ input, maxLength, expected }) => {
      expect(ensureMaxLength(input, maxLength)).toBe(expected);
    });
  });

  describe('with custom ellipsis', () => {
    it('should use the custom ellipsis string', () => {
      expect(ensureMaxLength('Hello, World!', 9, '~~')).toBe('Hello, ~~');
    });

    it('should use a single-char ellipsis', () => {
      expect(ensureMaxLength('abcdef', 4, '-')).toBe('abc-');
    });
  });

  describe('with empty ellipsis', () => {
    it('should hard-truncate without appending anything', () => {
      expect(ensureMaxLength('Hello, World!', 5, '')).toBe('Hello');
    });
  });

  describe('edge cases', () => {
    it('should return empty string as-is', () => {
      expect(ensureMaxLength('', 10)).toBe('');
    });

    it('should return falsy values as-is', () => {
      expect(ensureMaxLength(undefined as unknown as string, 10)).toBe(
        undefined
      );
      expect(ensureMaxLength(null as unknown as string, 10)).toBe(null);
    });

    it('should handle maxLength equal to ellipsis length', () => {
      expect(ensureMaxLength('Hello', 3)).toBe('...');
    });

    it('should handle maxLength of 0 with empty ellipsis', () => {
      expect(ensureMaxLength('test', 0, '')).toBe('');
    });
  });
});
