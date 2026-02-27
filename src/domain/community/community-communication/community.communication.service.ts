import { LogContext } from '@common/enums';
import { ICommunication } from '@domain/communication/communication';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';

@Injectable()
export class CommunityCommunicationService {
  constructor(
    private communicationService: CommunicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async addMemberToCommunication(
    communication: ICommunication,
    actorID: string
  ): Promise<void> {
    this.communicationService
      .addContributorToCommunications(communication, actorID)
      .catch(error =>
        this.logger.error(
          {
            message: `Unable to add user to community messaging (${communication.id})`,
            error: error?.message,
            details: error?.details,
          },
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }

  public async removeMemberFromCommunication(
    communication: ICommunication,
    actorID: string
  ): Promise<void> {
    this.communicationService
      .removeActorFromCommunications(communication, actorID)
      .catch(error =>
        this.logger.error(
          {
            message: `Unable remove user from community messaging (${communication.id})`,
            error: error?.message,
            details: error?.details,
          },
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }
}
