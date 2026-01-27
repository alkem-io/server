import { ReturnTypeFunc, Subscription } from '@nestjs/graphql';
import { SubscriptionResolveContext } from './subscription.resolve.context';
import { TypedSubscriptionOptions } from './typed.subscription.options';

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
