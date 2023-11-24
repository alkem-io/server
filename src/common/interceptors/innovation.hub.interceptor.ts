import {
  CallHandler,
  ExecutionContext,
  Inject,
  LoggerService,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { InnovationHubService } from '@domain/innovation-hub';
import { DOMAIN_PATTERN, SUBDOMAIN_PATTERN } from '@core/validation';

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
  `https?:\/\/(?<${SUBDOMAIN_GROUP}>${SUBDOMAIN_PATTERN})\\.${DOMAIN_PATTERN}.\\w+`
);

/***
 * Injects the Innovation Hub in the execution context, if matched with the subdomain
 */
export class InnovationHubInterceptor implements NestInterceptor {
  private readonly innovationHubHeader: string;

  constructor(
    private readonly innovationHubService: InnovationHubService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.innovationHubHeader = this.configService.get(
      ConfigurationTypes.INNOVATION_HUB
    )?.header;
  }

  async intercept(context: ExecutionContext, next: CallHandler) {
    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    const host = ctx.req.headers[this.innovationHubHeader] as
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
      ctx[INNOVATION_HUB_INJECT_TOKEN] =
        await this.innovationHubService.getInnovationHubOrFail({
          subdomain: subDomain,
        });
    } catch (e) {
      this.logger.warn(
        `${this.constructor.name} unable to find Innovation Hub with subdomain '${subDomain}'`,
        LogContext.INNOVATION_HUB
      );
    }

    return next.handle();
  }
}
