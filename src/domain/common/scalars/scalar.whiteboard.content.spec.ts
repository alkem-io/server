import { ValidationException } from '@common/exceptions';
import { Kind } from 'graphql';
import { WhiteboardContent } from './scalar.whiteboard.content';

// A valid whiteboard content value is now an opaque base64-encoded Yjs-V2
// snapshot (006-collab-content-unification) — NOT Excalidraw JSON. The scalar's
// only structural check is base64; the empty string is also accepted.
const validContent = Buffer.from('yjs-v2-snapshot-bytes').toString('base64');

describe('WhiteboardContent', () => {
  let scalar: WhiteboardContent;

  beforeEach(() => {
    scalar = new WhiteboardContent();
  });

  describe('description', () => {
    it('has a description', () => {
      expect(scalar.description).toBeDefined();
    });
  });

  describe('serialize', () => {
    it('returns the value as-is', () => {
      expect(scalar.serialize('hello')).toBe('hello');
    });

    it('returns any value unchanged', () => {
      const obj = { foo: 'bar' };
      expect(scalar.serialize(obj)).toBe(obj);
    });
  });

  describe('parseValue', () => {
    it('returns a valid whiteboard content string', () => {
      const result = scalar.parseValue(validContent);
      expect(result).toBe(validContent);
    });

    it('throws ValidationException for non-string value', () => {
      expect(() => scalar.parseValue(123)).toThrow(ValidationException);
    });
  });

  describe('parseLiteral', () => {
    it('validates and returns value for STRING kind', () => {
      const ast = { kind: Kind.STRING, value: validContent } as any;
      const result = scalar.parseLiteral(ast);
      expect(result).toBe(validContent);
    });

    it('returns empty string for non-STRING kind', () => {
      const ast = { kind: Kind.INT, value: '123' } as any;
      expect(scalar.parseLiteral(ast)).toBe('');
    });
  });

  describe('validate (static)', () => {
    it('throws ValidationException when value is not a string', () => {
      expect(() => WhiteboardContent.validate(42)).toThrow(ValidationException);
      expect(() => WhiteboardContent.validate(null)).toThrow(
        ValidationException
      );
      expect(() => WhiteboardContent.validate(undefined)).toThrow(
        ValidationException
      );
    });

    it('throws ValidationException when value exceeds max length', () => {
      const longValue = 'a'.repeat(8388608);
      expect(() => WhiteboardContent.validate(longValue)).toThrow(
        ValidationException
      );
    });

    it('throws ValidationException for a non-base64 string (hyphen not in the alphabet)', () => {
      expect(() => WhiteboardContent.validate('not-base64!')).toThrow(
        ValidationException
      );
    });

    it('throws ValidationException for a JSON string (braces/quotes are not base64)', () => {
      // Excalidraw JSON no longer crosses this boundary — its `{`, `"`, `:` chars
      // are outside the base64 alphabet, so the scalar rejects it.
      const jsonContent = JSON.stringify({ invalid: true });
      expect(() => WhiteboardContent.validate(jsonContent)).toThrow(
        ValidationException
      );
    });

    it('returns the value for valid content', () => {
      const result = WhiteboardContent.validate(validContent);
      expect(result).toBe(validContent);
    });
  });
});
