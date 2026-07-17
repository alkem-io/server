import { LogContext } from '@common/enums';
import { Controller, Inject } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { ack } from '@services/util';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { CollaborativeDocumentIntegrationService } from './collaborative-document-integration.service';
import {
  FetchInputData,
  InfoInputData,
  MemoContributionsInputData,
  OfficeDocumentContributionsInputData,
  OfficeDocumentRenameInputData,
  SaveInputData,
} from './inputs';
import {
  FetchOutputData,
  HealthCheckOutputData,
  InfoOutputData,
  SaveOutputData,
} from './outputs';
import {
  CollaborativeDocumentEventPattern,
  CollaborativeDocumentMessagePattern,
} from './types';

@Controller()
export class CollaborativeDocumentIntegrationController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: WinstonLogger,
    private readonly integrationService: CollaborativeDocumentIntegrationService
  ) {}

  @MessagePattern(CollaborativeDocumentMessagePattern.INFO, Transport.RMQ)
  public info(
    @Payload() data: InfoInputData,
    @Ctx() context: RmqContext
  ): Promise<InfoOutputData> {
    this.logger.verbose?.(
      `Received INFO request for document: ${data.documentId}`,
      LogContext.COLLAB_DOCUMENT_INTEGRATION
    );
    ack(context);
    return this.integrationService.info(data);
  }

  @MessagePattern(
    CollaborativeDocumentMessagePattern.HEALTH_CHECK,
    Transport.RMQ
  )
  public health(@Ctx() context: RmqContext): HealthCheckOutputData {
    ack(context);
    // can be tight to more complex health check in the future
    // for now just return true
    return new HealthCheckOutputData(true);
  }

  @MessagePattern(CollaborativeDocumentMessagePattern.SAVE, Transport.RMQ)
  public save(
    @Payload() data: SaveInputData,
    @Ctx() context: RmqContext
  ): Promise<SaveOutputData> {
    this.logger.verbose?.(
      `Received SAVE request for document: ${data.documentId}`,
      LogContext.COLLAB_DOCUMENT_INTEGRATION
    );
    ack(context);
    return this.integrationService.save(data);
  }

  @MessagePattern(CollaborativeDocumentMessagePattern.FETCH, Transport.RMQ)
  public fetch(
    @Payload() data: FetchInputData,
    @Ctx() context: RmqContext
  ): Promise<FetchOutputData> {
    this.logger.verbose?.(
      `Received FETCH request for document: ${data.documentId}`,
      LogContext.COLLAB_DOCUMENT_INTEGRATION
    );
    ack(context);
    return this.integrationService.fetch(data);
  }

  @MessagePattern(
    CollaborativeDocumentEventPattern.MEMO_CONTRIBUTION,
    Transport.RMQ
  )
  public memoContribution(
    @Payload() data: MemoContributionsInputData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    this.logger.verbose?.(
      `Received MEMO_CONTRIBUTION request for document: ${data.memoId}`,
      LogContext.COLLAB_DOCUMENT_INTEGRATION
    );
    ack(context);
    return this.integrationService.memoContributions(data);
  }

  @MessagePattern(
    CollaborativeDocumentEventPattern.OFFICE_DOCUMENT_CONTRIBUTION,
    Transport.RMQ
  )
  public officeDocumentContribution(
    @Payload() data: OfficeDocumentContributionsInputData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    this.logger.verbose?.(
      `Received OFFICE_DOCUMENT_CONTRIBUTION request for document: ${data.documentId}`,
      LogContext.COLLAB_DOCUMENT_INTEGRATION
    );
    ack(context);
    return this.integrationService.officeDocumentContributions(data);
  }

  @MessagePattern(
    CollaborativeDocumentEventPattern.OFFICE_DOCUMENT_VIEW,
    Transport.RMQ
  )
  public officeDocumentView(
    @Payload() data: OfficeDocumentContributionsInputData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    this.logger.verbose?.(
      `Received OFFICE_DOCUMENT_VIEW request for document: ${data.documentId}`,
      LogContext.COLLAB_DOCUMENT_INTEGRATION
    );
    ack(context);
    return this.integrationService.officeDocumentViews(data);
  }

  @MessagePattern(
    CollaborativeDocumentEventPattern.OFFICE_DOCUMENT_RENAME,
    Transport.RMQ
  )
  public officeDocumentRename(
    @Payload() data: OfficeDocumentRenameInputData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    this.logger.verbose?.(
      `Received OFFICE_DOCUMENT_RENAME request for document: ${data.documentId}`,
      LogContext.COLLAB_DOCUMENT_INTEGRATION
    );
    ack(context);
    return this.integrationService.officeDocumentRename(data);
  }
}
