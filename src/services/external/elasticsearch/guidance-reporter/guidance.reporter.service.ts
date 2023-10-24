import { randomUUID } from 'crypto';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@constants/index';
import { isElasticError, isElasticResponseError } from '../utils';
import { GuidanceUsage } from './guidance.usage';
import { GuidanceUsageDocument } from './guidance.usage.document';

const isFromAlkemioTeam = (email: string) => /.*@alkem\.io/.test(email);

@Injectable()
export class GuidanceReporterService {
  private readonly environment: string;
  private readonly indexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private readonly client: ElasticClient | undefined
  ) {
    if (!this.client) {
      this.logger.warn(
        'Elastic client not initialized',
        LogContext.CHAT_GUIDANCE_REPORTER
      );
    }
    const elasticsearch = this.configService.get(
      ConfigurationTypes.INTEGRATIONS
    )?.elasticsearch;

    this.environment = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.environment;

    this.indexName = elasticsearch?.indices?.guidance_usage;
  }

  public async reportUsage(data: GuidanceUsage) {
    if (!this.client) {
      return;
    }

    const { usage, author } = data;

    const document: GuidanceUsageDocument = {
      ...usage,
      author: author.id,
      '@timestamp': new Date(),
      alkemio: isFromAlkemioTeam(author.email),
      environment: this.environment,
    };

    const client = this.client;
    await this.wrapAction(() =>
      client.index({
        index: this.indexName,
        document,
      })
    );

    return;
  }

  private async wrapAction(actionOrFail: () => Promise<WriteResponseBase>) {
    try {
      const result = await actionOrFail();

      this.logger.verbose?.(
        `Event ingested to (${this.indexName})`,
        LogContext.CHAT_GUIDANCE_REPORTER
      );

      return result;
    } catch (e: unknown) {
      const errorId = this.handleError(e);
      this.logger.error(
        `Event FAILED to be ingested into (${this.indexName})`,
        { errorId },
        LogContext.CHAT_GUIDANCE_REPORTER
      );
    }
  }

  private handleError(error: unknown) {
    const errorId = randomUUID();
    const baseParams = {
      uuid: errorId,
    };

    if (isElasticResponseError(error)) {
      this.logger.error(
        error.message,
        {
          ...baseParams,
          name: error.name,
          status: error.meta.statusCode,
        },
        LogContext.CHAT_GUIDANCE_REPORTER
      );
    } else if (isElasticError(error)) {
      this.logger.error(error.error.type, {
        ...baseParams,
        status: error.status,
      });
    } else if (error instanceof Error) {
      this.logger.error(
        error.message,
        {
          ...baseParams,
          name: error.name,
        },
        LogContext.CHAT_GUIDANCE_REPORTER
      );
    } else {
      this.logger.error(error, baseParams, LogContext.CHAT_GUIDANCE_REPORTER);
    }

    return errorId;
  }
}
