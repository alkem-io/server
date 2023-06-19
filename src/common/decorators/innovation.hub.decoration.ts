import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';

export const InnovationHxb = createParamDecorator(
  (data, context: ExecutionContext) => {
    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    return ctx[INNOVATION_HUB_INJECT_TOKEN];
  }
);
