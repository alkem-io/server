import { LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ICommunication } from '@domain/communication/communication';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';
import { IContributor } from '../contributor/contributor.interface';
import { IUser } from '../user/user.interface';

@Injectable()
export class CommunityCommunicationService {
  constructor(
    private communicationService: CommunicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async addMemberToCommunication(
    communication: ICommunication,
    contributor: IContributor
  ): Promise<void> {
    if (!contributor.agent?.id) {
      throw new EntityNotInitializedException(
        `Contributor ${contributor.id} does not have an agent`,
        LogContext.COMMUNICATION
      );
    }
    this.communicationService
      .addContributorToCommunications(communication, contributor.agent.id)
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
    user: IUser
  ): Promise<void> {
    this.communicationService
      .removeUserFromCommunications(communication, user)
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
