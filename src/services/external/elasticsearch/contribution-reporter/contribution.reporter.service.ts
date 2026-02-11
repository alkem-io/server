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
  AuthorDetails,
  ContributionDetails,
  ContributionDocument,
} from '../types';
import { isElasticError, isElasticResponseError } from '../utils';

const isFromAlkemioTeam = (email: string) => /.*@alkem\.io/.test(email);

@Injectable()
export class ContributionReporterService {
  private readonly environment: string;
  private readonly activityIndexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
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
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'SPACE_JOINED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }
  public spaceContentEdited(
    contribution: ContributionDetails,
    authorDetails: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'SPACE_CONTENT_EDITED',
        id: contribution.id,
        name: contribution.name,
        author: authorDetails.id,
        space: contribution.space,
      },
      authorDetails
    );
  }
  // ===================
  public subspaceCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'SUBSPACE_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }
  public subspaceContentEdited(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'SUBSPACE_CONTENT_EDITED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }
  public subspaceJoined(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'SUBSPACE_JOINED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
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
        space: contribution.space,
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
        space: contribution.space,
      },
      details
    );
  }
  public calloutPostCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_POST_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }

  public calloutLinkCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_LINK_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }
  // todo: callout is not available; do we need it
  public calloutWhiteboardCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_WHITEBOARD_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }

  public calloutMemoCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_MEMO_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }

  public calloutPostCommentCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALLOUT_POST_COMMENT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }

  public calendarEventCreated(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'CALENDAR_EVENT_CREATED',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
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
        space: contribution.space,
      },
      details
    );
  }

  public whiteboardContribution(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'WHITEBOARD_CONTRIBUTION',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
      },
      details
    );
  }

  public memoContribution(
    contribution: ContributionDetails,
    details: AuthorDetails
  ): void {
    this.createDocument(
      {
        type: 'MEMO_CONTRIBUTION',
        id: contribution.id,
        name: contribution.name,
        author: details.id,
        space: contribution.space,
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
        { errorId },
        LogContext.CONTRIBUTION_REPORTER
      );
    }

    return undefined;
  }

  private async createDocument<TObject extends BaseContribution>(
    contribution: TObject,
    details: AuthorDetails
  ): Promise<WriteResponseBase | undefined> {
    if (!this.client) {
      return undefined;
    }

    const document: ContributionDocument = {
      ...contribution,
      '@timestamp': new Date(),
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
