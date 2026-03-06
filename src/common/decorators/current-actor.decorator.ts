import {
  createParamDecorator,
  ExecutionContext,
  ContextType as NestContextType,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

type ContextType = NestContextType | 'graphql';
/**
 * Parameter decorator that extracts the ActorContext from the current request.
 * The ActorContext contains the actor's identity, credentials, and authentication state.
 * Works for both GraphQL and REST contexts.
 */
export const CurrentActor = createParamDecorator(
  (data, context: ExecutionContext) => {
    const contextType = context.getType();

    if ((contextType as ContextType) === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext();
      return ctx.req.user;
    }

    // For HTTP/REST contexts
    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.user;
    }

    return null;
  }
);
