import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { EntityNotInitializedException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Injectable()
export class ConversationAuthorizationService {
  constructor(
    // Circular with ConversationService (removeMember re-applies this
    // policy synchronously) — forwardRef on both sides of the cycle.
    @Inject(forwardRef(() => ConversationService))
    private conversationService: ConversationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService,
    private userLookupService: UserLookupService
  ) {}

  public async applyAuthorizationPolicy(
    conversationID: string
  ): Promise<IAuthorizationPolicy[]> {
    const conversation = await this.conversationService.getConversationOrFail(
      conversationID,
      {
        relations: {
          authorization: true,
          room: true,
        },
      }
    );

    if (!conversation.authorization) {
      throw new EntityNotInitializedException(
        `authorization: Unable to load conversation entities for auth reset: ${conversation.id}`,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // T056: Determine all participants via membership pivot table
    const memberships =
      await this.conversationService.getConversationMembers(conversationID);

    // Resolve agent IDs to user IDs for authorization
    // Note: Current authorization system uses USER_SELF_MANAGEMENT credentials
    // In the future, this should be refactored to use agent-based credentials
    const participantUserIDs: string[] = [];
    for (const membership of memberships) {
      if (membership.actorType === ActorType.USER) {
        const user = await this.userLookupService.getUserById(
          membership.actorID
        );
        if (user) {
          participantUserIDs.push(user.id);
        }
      }
      // Note: Virtual contributors don't have user IDs, so they won't be included
      // in the authorization rules. This is acceptable since VCs interact via
      // the platform's service credentials, not user credentials.
    }

    // Rebuild from CURRENT membership: reset, then grant (house convention —
    // cf. user.service.authorization.ts). The conversation policy is a
    // standalone root, so without the reset every re-apply would APPEND a new
    // participant rule and a removed member's grant would survive forever
    // (server#6329 cause 2).
    this.authorizationPolicyService.reset(conversation.authorization);
    conversation.authorization.credentialRules.push(
      this.createCredentialRuleParticipantAccess(participantUserIDs)
    );

    updatedAuthorizations.push(conversation.authorization);

    // Cascade to the room, if it exists
    if (conversation.room) {
      let roomAuthorization =
        this.roomAuthorizationService.applyAuthorizationPolicy(
          conversation.room,
          conversation.authorization
        );
      roomAuthorization =
        this.roomAuthorizationService.allowContributorsToCreateMessages(
          roomAuthorization
        );
      roomAuthorization =
        this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
          roomAuthorization
        );
      updatedAuthorizations.push(roomAuthorization);
    }

    return updatedAuthorizations;
  }

  private createCredentialRuleParticipantAccess(
    userIDs: string[]
  ): IAuthorizationPolicyRuleCredential {
    const participantCriterias: ICredentialDefinition[] = userIDs.map(
      userID => ({
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: userID,
      })
    );
    const participantRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ, AuthorizationPrivilege.CONTRIBUTE],
        participantCriterias,
        'Communication Conversation Participants Access (Membership-based)'
      );
    participantRule.cascade = true;
    return participantRule;
  }
}
