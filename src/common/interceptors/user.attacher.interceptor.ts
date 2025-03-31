import {
  CallHandler,
  ContextType,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { OryStrategy } from '@core/authentication/ory.strategy';
import { OryApiStrategy } from '@core/authentication/ory.api.strategy';

export class UserAttacherInterceptor implements NestInterceptor {
  constructor(
    private readonly oryStrategy: OryStrategy,
    private readonly oryApiStrategy: OryApiStrategy
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = getRequest(context);
    return next.handle();
  }
}

const getRequest = (context: ExecutionContext) => {
  if (context.getType<ContextType | 'graphql'>() === 'graphql') {
    const ctx = GqlExecutionContext.create(context).getContext();

    // required for passport.js for websocket grapqhl subscriptions
    if (ctx.websocketHeader?.connectionParams) {
      const websocketHeader = ctx.websocketHeader?.connectionParams || {};

      return { headers: { ...websocketHeader } };
    }

    return ctx.req;
  }
  return context.switchToHttp().getRequest();
};
