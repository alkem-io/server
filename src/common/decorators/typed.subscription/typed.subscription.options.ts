import { ReturnTypeFuncValue, SubscriptionOptions } from '@nestjs/graphql';
import { GraphQLResolveInfo } from 'graphql';

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
  ) =>
    | TPayload
    | Promise<TPayload>
    | ReturnTypeFuncValue
    | Promise<ReturnTypeFuncValue>; // todo: change to provide other return type than payload
}
