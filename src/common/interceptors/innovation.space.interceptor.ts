import {
  ExecutionContext,
  NestInterceptor,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { INNOVATION_SPACE_INJECT_TOKEN } from '@common/constants';
import { InnovationSpaceService } from '@domain/innovation-space/innovation.space.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes, LogContext } from '@common/enums';

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
  private readonly innovationSpaceHeader: string;

  constructor(
    private readonly innovationSpaceService: InnovationSpaceService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.innovationSpaceHeader = this.configService.get(
      ConfigurationTypes.INNOVATION_SPACE
    )?.header;
  }

  async intercept(context: ExecutionContext, next: CallHandler) {
    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    const host = ctx.req.headers[this.innovationSpaceHeader] as
      | string
      | undefined;

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
