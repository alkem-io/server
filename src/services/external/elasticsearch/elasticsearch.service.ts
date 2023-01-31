import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes } from '@common/enums';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { isElasticError, isElasticResponseError } from './utils';
import { BaseContribution } from './events/base.contribution';

@Injectable()
export class ElasticsearchService {
  private readonly client: Client;

  private readonly activityIndexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService
  ) {
    const elasticsearch = this.configService.get(
      ConfigurationTypes.INTEGRATIONS
    )?.elasticsearch;

    const { host, retries, timeout, api_key } = elasticsearch;

    this.client = new Client({
      node: host,
      maxRetries: retries,
      requestTimeout: timeout,
      resurrectStrategy: 'ping',
      auth: { apiKey: api_key },
      tls: { rejectUnauthorized: false },
    });

    this.activityIndexName = elasticsearch?.indices?.contribution;
  }

  public async challengeCreated(challenge: IChallenge, author: string) {
    try {
      const result = await this.createDocument({
        type: 'CHALLENGE_CREATED',
        id: challenge.id,
        name: challenge.displayName,
        author,
        timestamp: new Date(),
      });

      this.logger.verbose?.(
        `Challenge (${challenge.id}) created event ingested to (${this.activityIndexName})`
      );

      return result;
    } catch (e: unknown) {
      this.handleError(
        e,
        `Challenge (${challenge.id}) created event FAILED ingest to (${this.activityIndexName})`
      );
    }
  }

  private async createDocument<TDocument extends BaseContribution>(
    document: TDocument
  ) {
    return this.client.index({
      index: this.activityIndexName,
      document,
    });
  }

  private handleError(error: unknown, message?: string) {
    if (isElasticResponseError(error)) {
      this.logger.error(error.message, {
        name: error.name,
        status: error.meta.statusCode,
      });
    } else if (isElasticError(error)) {
      this.logger.error(error.error.type, {
        status: error.status,
      });
    } else {
      this.logger.error(error);
    }

    if (message) {
      this.logger.error(message);
    }
  }
}
