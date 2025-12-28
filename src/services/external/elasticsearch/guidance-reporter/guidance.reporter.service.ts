import { randomUUID } from 'crypto';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@constants/index';
import { isElasticError, isElasticResponseError } from '../utils';
import { GuidanceUsage } from './guidance.usage';
import { GuidanceUsageDocument } from './guidance.usage.document';
import { AlkemioConfig } from '@src/types';
import { isAlkemioEmail } from '@domain/community/user-lookup/user.lookup.service';

@Injectable()
export class GuidanceReporterService {
  private readonly environment: string;
  private readonly indexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private readonly client: ElasticClient | undefined
  ) {
    if (!this.client) {
      this.logger.verbose?.(
        'Elastic client not initialized',
        LogContext.CHAT_GUIDANCE_REPORTER
      );
    }
    const elasticsearch = this.configService.get('integrations.elasticsearch', {
      infer: true,
    });

    this.environment = this.configService.get('hosting.environment', {
      infer: true,
    });

    this.indexName = elasticsearch?.indices?.guidance_usage;
  }

  public async logAnswer() // question: string,
  // guidanceEngineResponse: GuidanceEngineQueryResponse,
  // userId: string
  : Promise<string> {
    const answerId = randomUUID();
    // this.reportToElastic(question, guidanceEngineResponse, answerId, userId);

    return answerId;
  }

  private async reportToElastic() // question: string,
  // guidanceEngineResponse: GuidanceEngineQueryResponse,
  // answerId: string,
  // userId: string
  : Promise<void> {
    // const { email } = await this.userService.getUserByIdOrFail(userId);
    // this.reportUsage({
    //   usage: {
    //     answerId,
    //     answer: guidanceEngineResponse.answer,
    //     completionTokens: guidanceEngineResponse.completion_tokens,
    //     promptTokens: guidanceEngineResponse.prompt_tokens,
    //     question,
    //     sources: guidanceEngineResponse.sources,
    //     totalCost: guidanceEngineResponse.total_cost,
    //     totalTokens: guidanceEngineResponse.total_tokens,
    //   },
    //   author: {
    //     id: userId,
    //     email,
    //   },
    // });
  }

  private async reportUsage(data: GuidanceUsage) {
    if (!this.client) {
      return;
    }

    const { usage, author } = data;

    const document: GuidanceUsageDocument = {
      ...usage,
      author: author.id,
      '@timestamp': new Date(),
      alkemio: isAlkemioEmail(author.email),
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

  public async updateAnswerRelevance(
    virtualContributorID: string,
    answerId: string,
    relevance: boolean
  ) {
    if (!this.client) {
      return false;
    }

    // TODO: the reporting needs to be specific to the virtual contributor

    try {
      const result = await this.client.updateByQuery({
        index: this.indexName,
        query: {
          match: { answerId },
        },
        script: {
          source: `ctx._source.relevant = ${relevance}`,
          lang: 'painless',
        },
      });
      return Boolean(result.updated && result.updated > 0);
    } catch (e: any) {
      const errorId = this.handleError(e);
      this.logger.error(
        `Error while updating answer relevance '${answerId}' on VC ${virtualContributorID}`,
        { errorId },
        LogContext.CHAT_GUIDANCE_REPORTER
      );
      return false;
    }
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
