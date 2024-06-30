import { Injectable } from '@nestjs/common';
import { ICommunication } from '@domain/communication/communication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { CommunicationService } from './communication.service';
import { RoomAuthorizationService } from '../room/room.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class CommunicationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private communicationService: CommunicationService,
    private roomAuthorizationService: RoomAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communicationInput: ICommunication,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICommunication> {
    const communication =
      await this.communicationService.getCommunicationOrFail(
        communicationInput.id,
        {
          relations: {
            updates: {
              authorization: true,
            },
          },
        }
      );

    if (!communication.updates) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for communication ${communication.id} `,
        LogContext.COMMUNICATION
      );
    }

    communication.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communication.authorization,
        parentAuthorization
      );

    communication.updates =
      this.roomAuthorizationService.applyAuthorizationPolicy(
        communication.updates,
        communication.authorization
      );
    // Note: do NOT allow contributors to create new messages for updates...
    communication.updates.authorization =
      this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
        communication.updates.authorization
      );

    return communication;
  }
}
