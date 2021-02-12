// user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { TokenException } from '@utils/error-handling/exceptions';

export const AccessToken = createParamDecorator(
  (data, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context).getContext();
    const req = ctx.req;
    if (!req.headers.authorization)
      throw new TokenException(
        'No authorization header provided in the request!'
      );

    const [{}, token] = req.headers.authorization.split(' ');
    return token;
  }
);
