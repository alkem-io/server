import { performance } from 'node:perf_hooks';
import { LogContext } from '@common/enums';
import {
  COLLABORA_DOCUMENT_OPENED,
  COLLABORA_DOCUMENT_REPLACED,
  COLLABORA_DOCUMENT_UPLOADED,
  CollaboraDocumentAnalyticsEvent,
  CollaboraDocumentOpened,
  CollaboraDocumentReplaced,
  CollaboraDocumentUploaded,
} from '@domain/collaboration/collabora-document/events/collabora.document.analytics.events';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

type CollaboraAnalyticsReporter = (
  event: CollaboraDocumentAnalyticsEvent,
  levelZeroSpaceID: string
) => void;

@Injectable()
export class CollaboraDocumentAnalyticsEventHandler {
  constructor(
    private readonly communityResolverService: CommunityResolverService,
    private readonly contributionReporter: ContributionReporterService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @OnEvent(COLLABORA_DOCUMENT_OPENED)
  public async handleOpened(event: CollaboraDocumentOpened): Promise<void> {
    await this.report(event, COLLABORA_DOCUMENT_OPENED, (value, space) =>
      this.contributionReporter.collaboraDocumentOpened(
        { id: value.id, name: value.name, space },
        value.actorAttribution
      )
    );
  }

  @OnEvent(COLLABORA_DOCUMENT_REPLACED)
  public async handleReplaced(event: CollaboraDocumentReplaced): Promise<void> {
    await this.report(event, COLLABORA_DOCUMENT_REPLACED, (value, space) =>
      this.contributionReporter.calloutCollaboraDocumentReplaced(
        { id: value.id, name: value.name, space },
        value.actorAttribution
      )
    );
  }

  @OnEvent(COLLABORA_DOCUMENT_UPLOADED)
  public async handleUploaded(event: CollaboraDocumentUploaded): Promise<void> {
    await this.report(event, COLLABORA_DOCUMENT_UPLOADED, (value, space) =>
      this.contributionReporter.calloutCollaboraDocumentUploaded(
        { id: value.id, name: value.name, space },
        value.actorAttribution
      )
    );
  }

  private async report(
    event: CollaboraDocumentAnalyticsEvent,
    eventName: string,
    reporter: CollaboraAnalyticsReporter
  ): Promise<void> {
    const startedAt = performance.now();
    let levelZeroSpaceID: string;

    try {
      levelZeroSpaceID =
        await this.communityResolverService.getLevelZeroSpaceIdForCollaboraDocument(
          event.id
        );
      this.logLookupTiming(eventName, event.id, 'success', startedAt);
    } catch (error) {
      this.logLookupTiming(eventName, event.id, 'failure', startedAt);
      this.logFailure(eventName, event.id, error);
      return;
    }

    try {
      reporter(event, levelZeroSpaceID);
    } catch (error) {
      this.logFailure(eventName, event.id, error);
    }
  }

  private logLookupTiming(
    eventName: string,
    collaboraDocumentId: string,
    outcome: 'success' | 'failure',
    startedAt: number
  ): void {
    this.logger.log(
      {
        message: 'Collabora document analytics space lookup completed',
        eventName,
        collaboraDocumentId,
        outcome,
        durationMs: performance.now() - startedAt,
      },
      LogContext.COLLABORATION
    );
  }

  private logFailure(
    eventName: string,
    collaboraDocumentId: string,
    error: unknown
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    const details = error instanceof Error ? error.stack : undefined;
    this.logger.error(
      `Failed to process ${eventName} analytics for CollaboraDocument ${collaboraDocumentId}: ${message}`,
      details,
      LogContext.COLLABORATION
    );
  }
}
