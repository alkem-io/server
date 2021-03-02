// user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import jwt_decode from 'jwt-decode';

export const CurrentUser = createParamDecorator(
  (data, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context).getContext();
    if (ctx.req.user) return ctx.req.user.email;

    const [{}, decodedToken] = ctx.req.headers.authorization.split(' ');
    const token = jwt_decode(decodedToken);

    return (token as any).email;
  }
);
