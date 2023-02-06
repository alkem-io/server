import { randomUUID } from 'crypto';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes } from '@common/enums';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { IOpportunity } from '@src/domain';
import { ICallout } from '@domain/collaboration/callout';
import { IMessage } from '@domain/communication/message/message.interface';
import { isElasticError, isElasticResponseError } from './utils';
import {
  AuthorDetails,
  CONTRIBUTION_TYPE,
  ContributionDetails,
  ContributionDocument,
} from './types';
import { BaseContribution } from './events';
import { setTimeout } from 'timers';

const isFromAlkemioTeam = (email: string) => /.*@alkem\.io/.test(email);

@Injectable()
export class ElasticsearchService {
  private readonly client: Client | undefined;

  private readonly environment: string;
  private readonly activityIndexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService
  ) {
    const elasticsearch = this.configService.get(
      ConfigurationTypes.INTEGRATIONS
    )?.elasticsearch;

    this.environment = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.environment;

    const { host, retries, timeout, api_key } = elasticsearch;

    this.activityIndexName = elasticsearch?.indices?.contribution;

    if (!host) {
      this.logger.warn('Elasticsearch host URL not provided!');
      return;
    }

    if (!api_key) {
      this.logger.error('Elasticsearch API key not provided!');
      return;
    }

    this.client = new Client({
      node: host,
      maxRetries: retries,
      requestTimeout: timeout,
      resurrectStrategy: 'ping',
      auth: { apiKey: api_key },
      tls: { rejectUnauthorized: false },
    });
  }

  private getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  public test() {
    const authorsCount = 100;
    const hubCount = 20;
    const time = 20 * 5 * 1000;
    const timeCount = 2000;
    const startTimestamp = 1641038400000;
    const oneHour = 3600000;

    const timestamps = [];
    timestamps.push(startTimestamp);
    for (let i = 1; i < timeCount; i++) {
      timestamps.push(
        timestamps[i - 1] + getRandomArbitrary(oneHour, oneHour * 10)
      );
    }

    // const timestamps = new Array(timeCount).fill(null).map((value, i) => {
    //   return startTimestamp + i * this.getRandomInt(oneHour);
    // });

    const max = Object.values(CONTRIBUTION_TYPE).length;
    const authors = new Array(authorsCount).fill(null).map(() => randomUUID());
    const hubs = new Array(hubCount).fill(null).map(() => randomUUID());

    for (const timestamp of timestamps) {
      const events = getRandomArbitrary(1, 10);
      const subAuth = authors.slice(0, this.getRandomInt(authors.length));
      const subHub = hubs.slice(0, this.getRandomInt(authors.length));
      for (let i = 0; i < events; i++) {
        const author = subAuth[this.getRandomInt(subAuth.length)];
        const hub = subHub[this.getRandomInt(subHub.length)];
        setTimeout(() => {
          const type = Object.values(CONTRIBUTION_TYPE)[this.getRandomInt(max)];
          this.createDocumentTest(
            {
              type,
              author,
              id: randomUUID(),
              name: 'test' + randomUUID(),
              hub,
            },
            {
              id: author,
              email: 'admin@alkem.io',
            },
            timestamp
          );
        }, Math.floor(Math.random() * time));
      }
    }

    return true;
  }

  public hubJoined(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'HUB_JOINED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.id,
      },
      details
    );
  }
  public hubContentEdited(
    contribution: ContributionDetails,
    authorDetails: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'HUB_CONTENT_EDITED',
        id: contribution.id,
        name: contribution.name,
        author: authorDetails.id,
        hub: contribution.hub,
      },
      authorDetails
    );
  }
  // ===================
  public challengeCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CHALLENGE_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  public challengeContentEdited(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CHALLENGE_CONTENT_EDITED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  public challengeJoined(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CHALLENGE_JOINED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  // ===================
  public opportunityJoined(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'OPPORTUNITY_JOINED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  public opportunityCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'OPPORTUNITY_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  public opportunityContentEdited(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'OPPORTUNITY_CONTENT_EDITED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  // ===================
  public calloutCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  public calloutCommentCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_COMMENT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  public calloutCardCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_CARD_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  // todo: callout is not available; do we need it
  public calloutCanvasCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_CANVAS_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  public calloutCardCommentCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_CARD_COMMENT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  public calloutCanvasEdited(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_CANVAS_EDITED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }
  // ===================
  public updateCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'UPDATE_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        hub: contribution.hub,
      },
      details
    );
  }

  private async createDocumentTest<TObject extends BaseContribution>(
    contribution: TObject,
    details: AuthorDetails,
    timestamp: number
  ): Promise<WriteResponseBase | undefined> {
    if (!this.client) {
      return undefined;
    }

    const document: ContributionDocument = {
      ...contribution,
      '@timestamp': new Date(timestamp), // todo: is this UTC?
      alkemio: isFromAlkemioTeam(details.email),
      environment: this.environment,
    };

    try {
      const result = await this.client.index({
        index: this.activityIndexName,
        document,
      });

      this.logger.verbose?.(
        `Event '${contribution.type}' for object with id '(${contribution.id})' ingested to (${this.activityIndexName})`
      );

      return result;
    } catch (e: unknown) {
      const errorId = this.handleError(e);
      this.logger.error(
        `Event '${contribution.type}' for object with id '(${contribution.id})' FAILED to be ingested into (${this.activityIndexName})`,
        { uuid: errorId }
      );
    }

    return undefined;
  }

  // todo: base method to require type, id, name, author, and additional data
  private async createDocument<TObject extends BaseContribution>(
    contribution: TObject,
    details: AuthorDetails
  ): Promise<WriteResponseBase | undefined> {
    if (!this.client) {
      return undefined;
    }

    const document: ContributionDocument = {
      ...contribution,
      '@timestamp': new Date(), // todo: is this UTC?
      alkemio: isFromAlkemioTeam(details.email),
      environment: this.environment,
    };

    try {
      const result = await this.client.index({
        index: this.activityIndexName,
        document,
      });

      this.logger.verbose?.(
        `Event '${contribution.type}' for object with id '(${contribution.id})' ingested to (${this.activityIndexName})`
      );

      return result;
    } catch (e: unknown) {
      const errorId = this.handleError(e);
      this.logger.error(
        `Event '${contribution.type}' for object with id '(${contribution.id})' FAILED to be ingested into (${this.activityIndexName})`,
        { uuid: errorId }
      );
    }

    return undefined;
  }

  private handleError(error: unknown) {
    const errorId = randomUUID();
    const baseParams = {
      uuid: errorId,
    };

    if (isElasticResponseError(error)) {
      this.logger.error(error.message, {
        ...baseParams,
        name: error.name,
        status: error.meta.statusCode,
      });
    } else if (isElasticError(error)) {
      this.logger.error(error.error.type, {
        ...baseParams,
        status: error.status,
      });
    } else if (error instanceof Error) {
      this.logger.error(error.message, {
        ...baseParams,
        name: error.name,
      });
    } else {
      this.logger.error(error, baseParams);
    }

    return errorId;
  }
}

function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
