import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';
import { LogContext } from '@common/enums';
import { DOMAIN_PATTERN, SUBDOMAIN_PATTERN } from '@core/validation';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  LoggerService,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
  `https?://(?<${SUBDOMAIN_GROUP}>${SUBDOMAIN_PATTERN})\\.${DOMAIN_PATTERN}.\\w+`
);

/***
 * Injects the Innovation Hub in the execution context, if matched with the subdomain
 */
export class InnovationHubInterceptor implements NestInterceptor {
  private readonly innovationHubHeader: string;
  private readonly whitelistedSubdomains: string[];

  constructor(
    private readonly innovationHubService: InnovationHubService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.innovationHubHeader = this.configService.get('innovation_hub.header', {
      infer: true,
    });

    // Get whitelisted subdomains from config or use default list
    this.whitelistedSubdomains =
      this.configService
        .get('innovation_hub.whitelisted_subdomains', {
          infer: true,
        })
        .split(',') || [];
  }

  async intercept(context: ExecutionContext, next: CallHandler) {
    const contextType = context.getType<'http' | 'graphql' | 'rpc' | 'rmq'>();

    // Skip non-GraphQL contexts (RPC, RabbitMQ, HTTP REST, etc.)
    if (contextType !== 'graphql') {
      return next.handle();
    }

    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    // Safety check - ensure we have a request object
    if (!ctx?.req?.headers) {
      return next.handle();
    }

    const host = ctx.req.headers[this.innovationHubHeader] as
      | string
      | undefined;

    if (!host) {
      return next.handle();
    }

    const subDomain = SUBDOMAIN_REGEX.exec(host)?.groups?.[SUBDOMAIN_GROUP];

    if (!subDomain || this.whitelistedSubdomains.includes(subDomain)) {
      return next.handle();
    }

    try {
      ctx[INNOVATION_HUB_INJECT_TOKEN] =
        await this.innovationHubService.getInnovationHubFlexOrFail({
          subdomain: subDomain,
        }) as InnovationHub;
    } catch {
      this.logger.warn(
        `${this.constructor.name} unable to find Innovation Hub with subdomain '${subDomain}'`,
        LogContext.INNOVATION_HUB
      );
    }

    return next.handle();
  }
}
