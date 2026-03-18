import { ValidationError } from 'class-validator';
import { AbstractHandler } from './abstract.handler';
import { Handler } from './handler.interface';

// Concrete implementation for testing
class TestHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    return super.handle(value, metatype);
  }
}

describe('AbstractHandler', () => {
  it('should return null when no next handler is set', async () => {
    const handler = new TestHandler();

    const result = await handler.handle({}, String);

    expect(result).toBeNull();
  });

  it('should delegate to next handler when set', async () => {
    const handler = new TestHandler();
    const nextHandler: Handler = {
      setNext: vi.fn(),
      handle: vi.fn().mockResolvedValue([]),
    };

    handler.setNext(nextHandler);
    const result = await handler.handle({ test: true }, String);

    expect(nextHandler.handle).toHaveBeenCalledWith({ test: true }, String);
    expect(result).toEqual([]);
  });

  it('should return the next handler from setNext', () => {
    const handler = new TestHandler();
    const nextHandler: Handler = {
      setNext: vi.fn(),
      handle: vi.fn(),
    };

    const result = handler.setNext(nextHandler);

    expect(result).toBe(nextHandler);
  });

  it('should chain multiple handlers', async () => {
    const handler1 = new TestHandler();
    const handler2 = new TestHandler();
    const handler3: Handler = {
      setNext: vi.fn(),
      handle: vi.fn().mockResolvedValue([new ValidationError()]),
    };

    handler1.setNext(handler2);
    handler2.setNext(handler3);

    const result = await handler1.handle({}, String);

    expect(handler3.handle).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
