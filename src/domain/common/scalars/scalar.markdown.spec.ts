import { Markdown } from './scalar.markdown';

describe('Markdown Scalar', () => {
  let scalar: Markdown;

  beforeEach(() => {
    scalar = new Markdown();
  });

  describe('serialize', () => {
    it('should convert escaped newlines to actual newlines', () => {
      expect(scalar.serialize('line1\\nline2')).toBe('line1\nline2');
    });

    it('should convert escaped carriage returns', () => {
      expect(scalar.serialize('line1\\rline2')).toBe('line1\rline2');
    });

    it('should convert backslash-space to double newline for paragraph break', () => {
      expect(scalar.serialize('item1\\ item2')).toBe('item1\n\nitem2');
    });

    it('should preserve whitespace inside span tags while removing the tags', () => {
      expect(scalar.serialize('before<span></span>after')).toBe('beforeafter');
      expect(scalar.serialize('before<span> </span>after')).toBe(
        'before after'
      );
      expect(scalar.serialize('label:<span> </span>value')).toBe(
        'label: value'
      );
    });

    it('should convert br tags to newlines', () => {
      expect(scalar.serialize('line1<br>line2')).toBe('line1\nline2');
      expect(scalar.serialize('line1<br/>line2')).toBe('line1\nline2');
      expect(scalar.serialize('line1<br />line2')).toBe('line1\nline2');
      expect(scalar.serialize('line1<BR>line2')).toBe('line1\nline2');
    });

    it('should put list items on new lines and normalize spacing', () => {
      expect(scalar.serialize('*   item')).toBe('\n* item');
    });

    it('should preserve indentation for nested lists', () => {
      const input = '*   Either :      *   nested item';
      const expected = '\n* Either :\n      * nested item';
      expect(scalar.serialize(input)).toBe(expected);
    });

    it('should convert double spaces to double newlines for paragraph break', () => {
      expect(scalar.serialize('word1  word2')).toBe('word1\n\nword2');
      expect(scalar.serialize('word1   word2')).toBe('word1\n\nword2');
    });

    it('should handle complex mixed content', () => {
      const input =
        '<strong>Date:</strong>\\ value  <strong>Time:</strong>\\ value2';
      const expected =
        '<strong>Date:</strong>\n\nvalue\n\n<strong>Time:</strong>\n\nvalue2';
      expect(scalar.serialize(input)).toBe(expected);
    });

    it('should pass through non-string values unchanged', () => {
      expect(scalar.serialize(123)).toBe(123);
      expect(scalar.serialize(null)).toBe(null);
    });
  });

  describe('parseValue', () => {
    it('should validate string values', () => {
      expect(scalar.parseValue('valid markdown')).toBe('valid markdown');
    });

    it('should throw for non-string values', () => {
      expect(() => scalar.parseValue(123)).toThrow();
    });
  });
});
