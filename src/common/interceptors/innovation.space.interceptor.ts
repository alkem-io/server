import { ExecutionContext, NestInterceptor, CallHandler } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { INNOVATION_SPACE_INJECT_TOKEN } from '@common/constants';

export class InnovationSpaceInterceptor implements NestInterceptor {
  // todo remove lint
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(/* todo InnovationSpaceService */) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();
    // todo match a header, from the req object in the context, to the innovation space record in the database by nameID, using the service
    ctx[INNOVATION_SPACE_INJECT_TOKEN] = 'space_mock_id';

    return next.handle();
  }
}
