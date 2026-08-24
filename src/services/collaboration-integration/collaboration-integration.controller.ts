import { LogContext } from '@common/enums';
import { Controller, Inject } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { ack } from '@services/util';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { CollaborationIntegrationService } from './collaboration-integration.service';
import {
  ContributionInputData,
  FetchInputData,
  OfficeDocumentContributionsInputData,
  OfficeDocumentRenameInputData,
  SaveInputData,
} from './inputs';
import { FetchOutputData, SaveOutputData } from './outputs';
import {
  CollaborationEventPattern,
  CollaborationMessagePattern,
  OfficeDocumentEventPattern,
} from './types';

/**
 * Server-side RESPONDER for the unified collaboration contract
 * (`contracts/unified-metadata-rmq.md`). NestJS `Transport.RMQ` request/reply
 * (manual ack — FR-011), on the COLLABORATION_SERVICE queue. The unified
 * collaboration-service is the caller.
 *
 * These handlers REPLACE the two legacy dialects
 * (`collaborative-document-integration`, `whiteboard-integration`), which are
 * kept for coexistence and retired at the big-bang cutover.
 */
@Controller()
export class CollaborationIntegrationController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private readonly integrationService: CollaborationIntegrationService
  ) {}

  @MessagePattern(CollaborationMessagePattern.SAVE, Transport.RMQ)
  public save(
    @Payload() data: SaveInputData,
    @Ctx() context: RmqContext
  ): Promise<SaveOutputData> {
    this.logger.verbose?.(
      `Received collaboration-save for document: ${data.id}`,
      LogContext.COLLABORATION_INTEGRATION
    );
    ack(context);
    return this.integrationService.save(data);
  }

  @MessagePattern(CollaborationMessagePattern.FETCH, Transport.RMQ)
  public fetch(
    @Payload() data: FetchInputData,
    @Ctx() context: RmqContext
  ): Promise<FetchOutputData> {
    this.logger.verbose?.(
      `Received collaboration-fetch for document: ${data.id}`,
      LogContext.COLLABORATION_INTEGRATION
    );
    ack(context);
    return this.integrationService.fetch(data);
  }

  @EventPattern(CollaborationEventPattern.CONTRIBUTION, Transport.RMQ)
  public contribution(
    @Payload() data: ContributionInputData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    this.logger.verbose?.(
      `Received collaboration-contribution for document: ${data.id}`,
      LogContext.COLLABORATION_INTEGRATION
    );
    ack(context);
    return this.integrationService.contribution(data);
  }

  /**
   * Collabora office-document window/rename events (WOPI producer). A distinct
   * modality from the Yjs memo/whiteboard contract above, but hosted on this
   * unified consumer. These arrive on the COLLABORATION_DOCUMENT_SERVICE queue
   * (still bound in main.server.ts); the wire patterns are the frozen WOPI
   * contract (`OfficeDocumentEventPattern`).
   */
  @MessagePattern(OfficeDocumentEventPattern.CONTRIBUTION, Transport.RMQ)
  public officeDocumentContribution(
    @Payload() data: OfficeDocumentContributionsInputData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    this.logger.verbose?.(
      `Received collaboration-office-document-contribution for document: ${data.documentId}`,
      LogContext.COLLABORATION_INTEGRATION
    );
    ack(context);
    return this.integrationService.officeDocumentContributions(data);
  }

  @MessagePattern(OfficeDocumentEventPattern.VIEW, Transport.RMQ)
  public officeDocumentView(
    @Payload() data: OfficeDocumentContributionsInputData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    this.logger.verbose?.(
      `Received collaboration-office-document-view for document: ${data.documentId}`,
      LogContext.COLLABORATION_INTEGRATION
    );
    ack(context);
    return this.integrationService.officeDocumentViews(data);
  }

  @MessagePattern(OfficeDocumentEventPattern.RENAME, Transport.RMQ)
  public officeDocumentRename(
    @Payload() data: OfficeDocumentRenameInputData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    this.logger.verbose?.(
      `Received collaboration-office-document-rename for document: ${data.documentId}`,
      LogContext.COLLABORATION_INTEGRATION
    );
    ack(context);
    return this.integrationService.officeDocumentRename(data);
  }
}
