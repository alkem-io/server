import { ValidationException } from '@common/exceptions';
import { Kind } from 'graphql';
import {
  LIFECYCLE_DEFINITION_LENGTH,
  LifecycleDefinitionScalar,
} from './scalar.lifecycle.definition';

// Minimal valid xstate-like machine definition
const validDefinition = JSON.stringify({
  id: 'test',
  initial: 'idle',
  states: {
    idle: {},
  },
});

describe('LifecycleDefinitionScalar', () => {
  let scalar: LifecycleDefinitionScalar;

  beforeEach(() => {
    scalar = new LifecycleDefinitionScalar();
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
    it('returns a valid lifecycle definition string', () => {
      const result = scalar.parseValue(validDefinition);
      expect(result).toBe(validDefinition);
    });

    it('throws ValidationException for non-string value', () => {
      expect(() => scalar.parseValue(123)).toThrow(ValidationException);
    });
  });

  describe('parseLiteral', () => {
    it('validates and returns value for STRING kind', () => {
      const ast = { kind: Kind.STRING, value: validDefinition } as any;
      const result = scalar.parseLiteral(ast);
      expect(result).toBe(validDefinition);
    });

    it('returns empty string for non-STRING kind', () => {
      const ast = { kind: Kind.INT, value: '123' } as any;
      expect(scalar.parseLiteral(ast)).toBe('');
    });
  });

  describe('validate', () => {
    it('throws ValidationException when value is not a string', () => {
      expect(() => scalar.validate(42)).toThrow(ValidationException);
      expect(() => scalar.validate(null)).toThrow(ValidationException);
      expect(() => scalar.validate(undefined)).toThrow(ValidationException);
    });

    it('throws ValidationException when value exceeds max length', () => {
      const longValue = 'a'.repeat(LIFECYCLE_DEFINITION_LENGTH);
      expect(() => scalar.validate(longValue)).toThrow(ValidationException);
    });

    it('throws ValidationException for invalid JSON', () => {
      expect(() => scalar.validate('not-json')).toThrow(ValidationException);
    });

    it('throws ValidationException for invalid xstate definition with array errors', () => {
      // Valid JSON but invalid xstate definition (missing required fields)
      const invalidDef = JSON.stringify({ invalid: true });
      expect(() => scalar.validate(invalidDef)).toThrow(ValidationException);
    });

    it('returns the value for a valid definition', () => {
      const result = scalar.validate(validDefinition);
      expect(result).toBe(validDefinition);
    });
  });
});
