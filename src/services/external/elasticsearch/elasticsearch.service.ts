import { randomUUID } from 'crypto';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes } from '@common/enums';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { IUpdates } from '@domain/communication/updates/updates.interface';
import { IOpportunity } from '@src/domain';
import { ICallout } from '@domain/collaboration/callout';
import { isElasticError, isElasticResponseError } from './utils';
import { ContributionDocument } from './types';
import { BaseContribution } from './events';

type AuthorDetails = { id: string; email: string };

const isFromAlkemioTeam = (email: string) => /.*@alkem\.io/.test(email);

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

  public hubJoined(hub: IHub, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'HUB_JOINED',
        id: hub.id,
        name: hub.displayName,
        author: details.id,
      },
      details
    );
  }
  public hubContentEdited(hub: IHub, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'HUB_CONTENT_EDITED',
        id: hub.id,
        name: hub.displayName,
        author: details.id,
      },
      details
    );
  }
  // ===================
  public challengeCreated(challenge: IChallenge, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'CHALLENGE_CREATED',
        id: challenge.id,
        name: challenge.displayName,
        author: details.id,
      },
      details
    );
  }
  public challengeContentEdited(
    challenge: IChallenge,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CHALLENGE_CONTENT_EDITED',
        id: challenge.id,
        name: challenge.displayName,
        author: details.id,
      },
      details
    );
  }
  public challengeJoined(challenge: IChallenge, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'CHALLENGE_JOINED',
        id: challenge.id,
        name: challenge.displayName,
        author: details.id,
      },
      details
    );
  }
  // ===================
  public opportunityJoined(
    opportunity: IOpportunity,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'OPPORTUNITY_JOINED',
        id: opportunity.id,
        name: opportunity.displayName,
        author: details.id,
      },
      details
    );
  }
  public opportunityCreated(
    opportunity: IOpportunity,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'OPPORTUNITY_CREATED',
        id: opportunity.id,
        name: opportunity.displayName,
        author: details.id,
      },
      details
    );
  }
  public opportunityContentEdited(
    opportunity: IOpportunity,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'OPPORTUNITY_CONTENT_EDITED',
        id: opportunity.id,
        name: opportunity.displayName,
        author: details.id,
      },
      details
    );
  }
  // ===================
  public calloutCreated(callout: ICallout, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'CALLOUT_CREATED',
        id: callout.id,
        name: callout.displayName,
        author: details.id,
      },
      details
    );
  }
  public calloutCommentCreated(
    callout: ICallout,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_COMMENT_CREATED',
        id: callout.id,
        name: callout.displayName,
        author: details.id,
      },
      details
    );
  }
  public calloutCardCreated(callout: ICallout, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'CALLOUT_CARD_CREATED',
        id: callout.id,
        name: callout.displayName,
        author: details.id,
      },
      details
    );
  }
  public calloutCanvasCreated(callout: ICallout, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'CALLOUT_CANVAS_CREATED',
        id: callout.id,
        name: callout.displayName,
        author: details.id,
      },
      details
    );
  }
  public calloutCardCommentCreated(
    callout: ICallout,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_CARD_COMMENT_CREATED',
        id: callout.id,
        name: callout.displayName,
        author: details.id,
      },
      details
    );
  }
  public calloutCanvasEdited(callout: ICallout, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'CALLOUT_CANVAS_EDITED',
        id: callout.id,
        name: callout.displayName,
        author: details.id,
      },
      details
    );
  }
  // ===================
  public updateCreated(update: IUpdates, details: AuthorDetails): void {
    this.createDocument(
      {
        type: 'UPDATE_CREATED',
        id: update.id,
        name: update.displayName,
        author: details.id,
      },
      details
    );
  }
  // todo: base method to require type, id, name, author, and additional data
  private async createDocument<TObject extends BaseContribution>(
    object: TObject,
    details: AuthorDetails
  ): Promise<WriteResponseBase | undefined> {
    const document: ContributionDocument = {
      ...object,
      timestamp: new Date(), // todo: is this UTC?
      alkemio: isFromAlkemioTeam(details.email),
    };

    try {
      const result = await this.client.index({
        index: this.activityIndexName,
        document,
      });

      this.logger.verbose?.(
        `Event '${object.type}' for object with id '(${object.id})' ingested to (${this.activityIndexName})`
      );

      return result;
    } catch (e: unknown) {
      const errorId = this.handleError(e);
      this.logger.error(
        `Event '${object.type}' for object with id '(${object.id})' FAILED to be ingested into (${this.activityIndexName})`,
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
