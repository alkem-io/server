import { randomUUID } from 'crypto';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { isElasticError, isElasticResponseError } from '../utils';
import { ContributionDetails, ContributionDocument } from '../types';
import { BaseContribution } from '../events';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@constants/index';
import { AlkemioConfig } from '@src/types';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

@Injectable()
export class ContributionReporterService {
  private readonly environment: string;
  private readonly activityIndexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private readonly client: ElasticClient | undefined,
    private readonly userLookupService: UserLookupService
  ) {
    const elasticsearch = this.configService.get('integrations.elasticsearch', {
      infer: true,
    });

    this.environment = this.configService.get('hosting.environment', {
      infer: true,
    });

    this.activityIndexName = elasticsearch?.indices?.contribution;
  }

  public spaceJoined(contribution: ContributionDetails, actorId: string): void {
    this.createDocument(
      {
        type: 'SPACE_JOINED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public spaceContentEdited(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'SPACE_CONTENT_EDITED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  // ===================
  public subspaceCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'SUBSPACE_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public subspaceContentEdited(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'SUBSPACE_CONTENT_EDITED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public subspaceJoined(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'SUBSPACE_JOINED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  // ===================
  public calloutCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public calloutCommentCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_COMMENT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public calloutPostCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_POST_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public calloutLinkCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_LINK_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  // todo: callout is not available; do we need it
  public calloutWhiteboardCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_WHITEBOARD_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public calloutMemoCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_MEMO_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public calloutPostCommentCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_POST_COMMENT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public calendarEventCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'CALENDAR_EVENT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  // ===================
  public updateCreated(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'UPDATE_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public whiteboardContribution(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'WHITEBOARD_CONTRIBUTION',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  public memoContribution(
    contribution: ContributionDetails,
    actorId: string
  ): void {
    this.createDocument(
      {
        type: 'MEMO_CONTRIBUTION',
        id: contribution.id,
        name: contribution.name,
        author: actorId,
        space: contribution.space,
      },
      actorId
    );
  }

  private async createDocumentTest<TObject extends BaseContribution>(
    contribution: TObject,
    actorId: string,
    timestamp: number
  ): Promise<WriteResponseBase | undefined> {
    if (!this.client) {
      return undefined;
    }

    const document: ContributionDocument = {
      ...contribution,
      '@timestamp': new Date(timestamp), // todo: is this UTC?
      alkemio: await this.userLookupService.isFromAlkemioTeam(actorId),
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
        { errorId },
        LogContext.CONTRIBUTION_REPORTER
      );
    }

    return undefined;
  }

  private async createDocument<TObject extends BaseContribution>(
    contribution: TObject,
    actorId: string
  ): Promise<WriteResponseBase | undefined> {
    if (!this.client) {
      return undefined;
    }

    const document: ContributionDocument = {
      ...contribution,
      '@timestamp': new Date(),
      alkemio: await this.userLookupService.isFromAlkemioTeam(actorId),
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
        { uuid: errorId },
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
