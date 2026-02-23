import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Parameter decorator that extracts the ActorContext from the current request.
 * The ActorContext contains the actor's identity, credentials, and authentication state.
 */
export const CurrentActor = createParamDecorator(
  (data, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context).getContext();
    if (ctx.req.user) return ctx.req.user;
  }
);
