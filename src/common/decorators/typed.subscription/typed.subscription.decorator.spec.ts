import { vi } from 'vitest';

// Mock @nestjs/graphql Subscription before importing the module under test
vi.mock('@nestjs/graphql', () => ({
  Subscription: vi.fn().mockReturnValue(() => {}),
  ReturnTypeFunc: undefined,
}));

import { Subscription } from '@nestjs/graphql';
import { TypedSubscription } from './typed.subscription.decorator';

describe('TypedSubscription', () => {
  beforeEach(() => {
    vi.mocked(Subscription).mockClear();
  });

  it('should delegate to @nestjs/graphql Subscription', () => {
    const typeFunc = () => String;
    TypedSubscription(typeFunc);

    expect(Subscription).toHaveBeenCalledWith(typeFunc, undefined);
  });

  it('should pass options to Subscription', () => {
    const typeFunc = () => String;
    const options = {
      filter: vi.fn(),
      resolve: vi.fn(),
    };

    TypedSubscription(typeFunc, options as any);

    expect(Subscription).toHaveBeenCalledWith(typeFunc, options);
  });

  it('should return the result of Subscription', () => {
    const mockDecorator = vi.fn();
    vi.mocked(Subscription).mockReturnValue(mockDecorator);

    const typeFunc = () => String;
    const result = TypedSubscription(typeFunc);

    expect(result).toBe(mockDecorator);
  });
});
