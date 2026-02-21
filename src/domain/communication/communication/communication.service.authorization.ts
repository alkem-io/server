import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InheritedCredentialRuleSetService } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service';
import { ICommunication } from '@domain/communication/communication';
import { Injectable } from '@nestjs/common';
import { RoomAuthorizationService } from '../room/room.service.authorization';
import { CommunicationService } from './communication.service';

@Injectable()
export class CommunicationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private inheritedCredentialRuleSetService: InheritedCredentialRuleSetService,
    private communicationService: CommunicationService,
    private roomAuthorizationService: RoomAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communicationInput: ICommunication,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
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
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    communication.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communication.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(communication.authorization);

    await this.inheritedCredentialRuleSetService.resolveForParent(
      communication.authorization
    );

    let roomUpdatedAuthorization =
      this.roomAuthorizationService.applyAuthorizationPolicy(
        communication.updates,
        communication.authorization
      );
    // Note: do NOT allow contributors to create new messages for updates...
    roomUpdatedAuthorization =
      this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
        roomUpdatedAuthorization
      );

    updatedAuthorizations.push(roomUpdatedAuthorization);

    return updatedAuthorizations;
  }
}
