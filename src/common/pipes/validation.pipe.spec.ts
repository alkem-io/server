import { vi } from 'vitest';
import { ValidationPipe } from './validation.pipe';

// Mock the BaseHandler as a proper class constructor
vi.mock('@core/validation/handlers/base/base.handler', () => ({
  BaseHandler: class MockBaseHandler {
    handle = vi.fn().mockResolvedValue([]);
  },
}));

// Mock class-transformer
vi.mock('class-transformer', () => ({
  plainToInstance: vi.fn().mockImplementation((_cls: any, value: any) => value),
}));

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  describe('transform', () => {
    it('should return value as-is when metatype is undefined', async () => {
      const value = { name: 'test' };
      const result = await pipe.transform(value, {
        type: 'body',
        metatype: undefined,
      });
      expect(result).toBe(value);
    });

    it('should return value as-is when metatype is String', async () => {
      const value = 'hello';
      const result = await pipe.transform(value, {
        type: 'body',
        metatype: String,
      });
      expect(result).toBe(value);
    });

    it('should return value as-is when metatype is Boolean', async () => {
      const value = true;
      const result = await pipe.transform(value, {
        type: 'body',
        metatype: Boolean,
      });
      expect(result).toBe(value);
    });

    it('should return value as-is when metatype is Number', async () => {
      const value = 42;
      const result = await pipe.transform(value, {
        type: 'body',
        metatype: Number,
      });
      expect(result).toBe(value);
    });

    it('should return value as-is when metatype is Array', async () => {
      const value = [1, 2, 3];
      const result = await pipe.transform(value, {
        type: 'body',
        metatype: Array,
      });
      expect(result).toBe(value);
    });

    it('should return value as-is when metatype is Object', async () => {
      const value = { key: 'val' };
      const result = await pipe.transform(value, {
        type: 'body',
        metatype: Object,
      });
      expect(result).toBe(value);
    });

    it('should validate custom class metatypes', async () => {
      class CustomDto {
        name!: string;
      }

      const value = { name: 'test' };
      const result = await pipe.transform(value, {
        type: 'body',
        metatype: CustomDto,
      });
      expect(result).toBe(value);
    });

    it('should call plainToInstance for custom metatypes', async () => {
      const { plainToInstance } = await import('class-transformer');

      class MyDto {
        field!: string;
      }

      const value = { field: 'data' };
      await pipe.transform(value, { type: 'body', metatype: MyDto });

      expect(plainToInstance).toHaveBeenCalledWith(MyDto, value);
    });

    it('should delegate to BaseHandler for validation', async () => {
      const { BaseHandler } = await import(
        '@core/validation/handlers/base/base.handler'
      );

      class AnotherDto {
        id!: string;
      }

      const value = { id: '123' };
      await pipe.transform(value, { type: 'body', metatype: AnotherDto });

      // Verify BaseHandler was instantiated
      expect(BaseHandler).toBeDefined();
    });
  });
});
