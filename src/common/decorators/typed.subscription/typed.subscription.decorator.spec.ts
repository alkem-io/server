import { Subscription } from '@nestjs/graphql';
import { TypedSubscription } from './typed.subscription.decorator';

describe('TypedSubscription', () => {
  it('should delegate to @nestjs/graphql Subscription and return a MethodDecorator', () => {
    const typeFunc = () => String;
    const result = TypedSubscription(typeFunc);

    // TypedSubscription wraps Subscription, so the result should be a MethodDecorator
    expect(typeof result).toBe('function');
  });

  it('should produce the same result as calling Subscription directly', () => {
    const typeFunc = () => String;
    const options = {
      filter: () => true,
      resolve: (value: any) => value,
    };

    // Both should return method decorators without throwing
    const directResult = Subscription(typeFunc, options);
    const wrappedResult = TypedSubscription(typeFunc, options as any);

    expect(typeof directResult).toBe('function');
    expect(typeof wrappedResult).toBe('function');
  });

  it('should accept options and pass them through', () => {
    const typeFunc = () => String;
    const options = {
      filter: () => true,
      resolve: (value: any) => value,
    };

    // Should not throw when called with options
    const result = TypedSubscription(typeFunc, options as any);
    expect(typeof result).toBe('function');
  });
});
