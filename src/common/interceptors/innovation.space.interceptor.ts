import {
  ExecutionContext,
  NestInterceptor,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { INNOVATION_SPACE_INJECT_TOKEN } from '@common/constants';
import { InnovationSpaceService } from '@domain/innovation-space/innovation.space.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

const SUBDOMAIN_GROUP = 'subdomain';
/***
 Matches the following examples
 https://acc.acc1.acc2.alkem.io/ -> acc
 https://dev.alkem.io/ -> dev
 https://test.alkem.io/ -> test
 http://test.alkem.io/ -> test

 * Does not match
 https://alkem.io/
 */
const SUBDOMAIN_REGEX = new RegExp(
  `https?:\/\/(?<${SUBDOMAIN_GROUP}>\\w+)\\.\\w+\\.\\w+`
);

export class InnovationSpaceInterceptor implements NestInterceptor {
  constructor(
    private readonly innovationSpaceService: InnovationSpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    const host = ctx.req.headers['myhost'] as string | undefined;

    if (!host) {
      return next.handle();
    }

    const subDomain = SUBDOMAIN_REGEX.exec(host)?.groups?.[SUBDOMAIN_GROUP];

    if (!subDomain) {
      return next.handle();
    }

    try {
      // subDomain used to match 1:1 the nameID of an Innovation space
      const innovationSpace =
        await this.innovationSpaceService.getInnovationSpaceOrFail(subDomain);

      ctx[INNOVATION_SPACE_INJECT_TOKEN] = innovationSpace.id;
    } catch (e) {
      this.logger.warn(
        `${this.constructor.name} unable to find Innovation space with nameID '${subDomain}'`,
        LogContext.INNOVATION_SPACE
      );
    }

    return next.handle();
  }
}
