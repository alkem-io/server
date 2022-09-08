import { ReturnTypeFunc, Subscription } from '@nestjs/graphql';
import { TypedSubscriptionOptions } from './typed.subscription.options';
import { SubscriptionResolveContext } from './subscription.resolve.context';

export function TypedSubscription<
  TPayload = unknown,
  TVariables = unknown,
  TContext = SubscriptionResolveContext
>(
  typeFunc: ReturnTypeFunc,
  options?: TypedSubscriptionOptions<TPayload, TVariables, TContext>
): MethodDecorator {
  return Subscription(typeFunc, options);
}
