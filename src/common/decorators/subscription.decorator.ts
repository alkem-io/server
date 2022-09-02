import { IncomingHttpHeaders } from 'http';
import {
  ReturnTypeFunc,
  Subscription,
  SubscriptionOptions,
} from '@nestjs/graphql';
import { GraphQLResolveInfo } from 'graphql';
import { AgentInfo } from '@src/core';

export interface ResolveContext {
  req: {
    authInfo: unknown;
    headers: IncomingHttpHeaders;
    user: AgentInfo;
  };
}

export interface TypedSubscriptionOptions<TPayload, TVariables, TContext>
  extends SubscriptionOptions {
  /**
   * Filter messages function.
   */
  filter: (
    payload: TPayload,
    variables: TVariables,
    context: TContext
  ) => boolean | Promise<boolean>;
  /**
   * Resolve messages function (to transform payload/message shape).
   * <b>This function can transform the return value, but let's stick to the payload type for now.<b>
   */
  resolve: (
    payload: TPayload,
    args: TVariables,
    context: TContext,
    info: GraphQLResolveInfo
  ) => TPayload | Promise<TPayload>;
}

export function TypedSubscription<
  TPayload = unknown, // can this be provided directly as typeFunc? like () => TPayload, but as value
  TVariables = unknown,
  TContext = ResolveContext
>(
  typeFunc: ReturnTypeFunc,
  options?: TypedSubscriptionOptions<TPayload, TVariables, TContext>
): MethodDecorator {
  return Subscription(typeFunc, options);
}
