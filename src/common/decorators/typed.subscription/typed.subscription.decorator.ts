import { ReturnTypeFunc, Subscription } from '@nestjs/graphql';
import { TypedSubscriptionOptions } from '@common/decorators';
import { SubscriptionResolveContext } from '@common/decorators';

export function TypedSubscription<
  TPayload = unknown,
  TVariables = unknown,
  TContext = SubscriptionResolveContext,
>(
  typeFunc: ReturnTypeFunc,
  options?: TypedSubscriptionOptions<TPayload, TVariables, TContext>
): MethodDecorator {
  return Subscription(typeFunc, options);
}
