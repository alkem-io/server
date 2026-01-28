import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const InnovationHub = createParamDecorator(
  (data, context: ExecutionContext) => {
    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    return ctx[INNOVATION_HUB_INJECT_TOKEN];
  }
);
