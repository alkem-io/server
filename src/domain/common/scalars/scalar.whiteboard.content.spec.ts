import { ValidationException } from '@common/exceptions';
import { Kind } from 'graphql';
import { WhiteboardContent } from './scalar.whiteboard.content';

// Minimal valid excalidraw content
const validContent = JSON.stringify({
  type: 'excalidraw',
  version: 2,
  elements: [],
  appState: {},
});

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

    it('throws ValidationException for invalid JSON', () => {
      expect(() => WhiteboardContent.validate('not-json')).toThrow(
        ValidationException
      );
    });

    it('throws ValidationException for invalid excalidraw content with array errors', () => {
      // Valid JSON but missing required excalidraw fields
      const invalidContent = JSON.stringify({ invalid: true });
      expect(() => WhiteboardContent.validate(invalidContent)).toThrow(
        ValidationException
      );
    });

    it('returns the value for valid content', () => {
      const result = WhiteboardContent.validate(validContent);
      expect(result).toBe(validContent);
    });
  });
});
