import { LogContext } from '@common/enums';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@constants/index';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseContribution } from '../events';
import {
  CONTRIBUTION_TYPE,
  ContributionDetails,
  ContributionDocument,
} from '../types';
import { isElasticError, isElasticResponseError } from '../utils';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorService } from '@domain/actor';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ContributionAuthorDetails } from '../types/contribution.author.details';

const isFromAlkemioTeam = (email: string) => /.*@alkem\.io/.test(email);

type ContributionActorContext = Partial<Pick<ActorContext, 'actorID' | 'isAnonymous' | 'guestName'>>;

@Injectable()
export class ContributionReporterService {
  private readonly environment: string;
  private readonly activityIndexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly actorService: ActorService,
    private readonly userLookupService: UserLookupService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private readonly client: ElasticClient | undefined
  ) {
    const elasticsearch = this.configService.get('integrations.elasticsearch', {
      infer: true,
    });

    this.environment = this.configService.get('hosting.environment', {
      infer: true,
    });

    this.activityIndexName = elasticsearch?.indices?.contribution;
  }

  public spaceJoined(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.SPACE_JOINED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  public spaceContentEdited(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.SPACE_CONTENT_EDITED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  // ===================
  public subspaceCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.SUBSPACE_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  public subspaceContentEdited(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.SUBSPACE_CONTENT_EDITED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  public subspaceJoined(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.SUBSPACE_JOINED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  // ===================
  public calloutCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.CALLOUT_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  public calloutCommentCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.CALLOUT_COMMENT_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  public calloutPostCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.CALLOUT_POST_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }

  public calloutLinkCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.CALLOUT_LINK_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  // todo: callout is not available; do we need it
  public calloutWhiteboardCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.CALLOUT_WHITEBOARD_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }

  public calloutMemoCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.CALLOUT_MEMO_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }

  public calloutPostCommentCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.CALLOUT_POST_COMMENT_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }

  public calendarEventCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.CALENDAR_EVENT_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }
  // ===================
  public updateCreated(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.UPDATE_CREATED,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }

  public whiteboardContribution(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.WHITEBOARD_CONTRIBUTION,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }

  public memoContribution(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.MEMO_CONTRIBUTION,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }

  public mediaGalleryContribution(
    contribution: ContributionDetails,
    actorContext: ContributionActorContext
  ): void {
    void this.createDocument(
      {
        type: CONTRIBUTION_TYPE.MEDIA_GALLERY_CONTRIBUTION,
        id: contribution.id,
        name: contribution.name,
        space: contribution.space,
      },
      actorContext
    );
  }

  private async getAuthorDetails(
    actorContext: ContributionActorContext
  ): Promise<ContributionAuthorDetails> {
    if (actorContext.actorID) {
      const actor = await this.actorService.getActorOrNull(actorContext.actorID);
      if (actor && actor.type === 'user') {
        try {
          const user = await this.userLookupService.getUserByIdOrFail(actor.id)
          return {
            author: actor.id,
            anonymous: false,
            alkemio: isFromAlkemioTeam(user.email),
            guest: false
          }
        } catch (e) {
          this.logger.error(
            {
              message: 'Unable to fetch user details for actor in ContributionReporterService',
              actorContext,
              actorId: actor.id,
              error: e
            },
            undefined,
            LogContext.CONTRIBUTION_REPORTER
          );
          return {
            author: actor.id,
            anonymous: false,
            alkemio: false,
            guest: false,
          }
        }
      }
    }
    if (actorContext.guestName) {
      return {
        alkemio: false,
        anonymous: false,
        guest: true,
        guestName: actorContext.guestName,
      }
    }
    if (actorContext.isAnonymous) {
      return {
        alkemio: false,
        anonymous: true,
        guest: false,
      }
    }

    this.logger.verbose?.({
        message: 'Unknown actor context for contribution, defaulting to anonymous',
        actorContext,
      },
      LogContext.CONTRIBUTION_REPORTER
    );
    return {
      alkemio: false,
      anonymous: true,
      guest: false,
    }
  }

  private async createDocumentTest<TObject extends BaseContribution>(
    contribution: Omit<TObject, 'author'>,
    actorContext: ContributionActorContext,
    timestamp: number
  ): Promise<WriteResponseBase | undefined> {
    if (!this.client) {
      return undefined;
    }

    try {
      const document: ContributionDocument = {
        ...contribution,
        ...(await this.getAuthorDetails(actorContext)),
        '@timestamp': new Date(timestamp),
        environment: this.environment,
      };

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
        { errorId },
        LogContext.CONTRIBUTION_REPORTER
      );
    }

    return undefined;
  }

  private async createDocument<TObject extends BaseContribution>(
    contribution: Omit<TObject, 'author'>,
    actorContext: ContributionActorContext
  ): Promise<WriteResponseBase | undefined> {
    if (!this.client) {
      return undefined;
    }

    try {

      const document: ContributionDocument = {
        ...contribution,
        ...(await this.getAuthorDetails(actorContext)),
        '@timestamp': new Date(),
        environment: this.environment,
      };

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
        { errorId },
        LogContext.CONTRIBUTION_REPORTER
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
      this.logger.error(
        error.message,
        {
          ...baseParams,
          name: error.name,
          status: error.meta.statusCode,
        },
        LogContext.CONTRIBUTION_REPORTER
      );
    } else if (isElasticError(error)) {
      this.logger.error(
        error.error.type,
        {
          ...baseParams,
          status: error.status,
        },
        LogContext.CONTRIBUTION_REPORTER
      );
    } else if (error instanceof Error) {
      this.logger.error(
        error.message,
        {
          ...baseParams,
          name: error.name,
        },
        LogContext.CONTRIBUTION_REPORTER
      );
    } else {
      this.logger.error(error, baseParams, LogContext.CONTRIBUTION_REPORTER);
    }

    return errorId;
  }
}
