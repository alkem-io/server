import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityService } from './community.service';
import { Community, ICommunity } from '@domain/community/community';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { CommunicationAuthorizationService } from '@domain/communication/communication/communication.service.authorization';
import { ApplicationAuthorizationService } from '../application/application.service.authorization';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_COMMUNITY_GLOBAL_ADMINS,
  CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_COMMUNITY_SELF_REMOVAL,
  POLICY_RULE_COMMUNITY_INVITE,
} from '@common/constants';
import { InvitationExternalAuthorizationService } from '../invitation.external/invitation.external.service.authorization';
import { InvitationAuthorizationService } from '../invitation/invitation.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityGuidelinesAuthorizationService } from '../community-guidelines/community.guidelines.service.authorization';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private invitationExternalAuthorizationService: InvitationExternalAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>
  ) {}

  async applyAuthorizationPolicy(
    communityInput: ICommunity,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      communityInput.id,
      {
        relations: {
          communication: {
            updates: true,
          },
          policy: true,
          groups: true,
          applications: true,
          invitations: true,
          externalInvitations: true,
          guidelines: true,
        },
      }
    );
    if (
      !community.communication ||
      !community.communication.updates ||
      !community.policy ||
      !community.groups ||
      !community.applications ||
      !community.invitations ||
      !community.externalInvitations ||
      !community.guidelines
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for community authorization: ${community.id} `,
        LogContext.COMMUNITY
      );
    }
    community.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        community.authorization,
        parentAuthorization
      );

    community.authorization = this.extendAuthorizationPolicy(
      community.authorization,
      parentAuthorization?.anonymousReadAccess
    );
    community.authorization = this.appendVerifiedCredentialRules(
      community.authorization
    );
    community.authorization = this.appendPrivilegeRules(
      community.authorization
    );

    // always false
    community.authorization.anonymousReadAccess = false;

    community.communication =
      await this.communicationAuthorizationService.applyAuthorizationPolicy(
        community.communication,
        community.authorization
      );

    // cascade
    for (const group of community.groups) {
      const savedGroup =
        await this.userGroupAuthorizationService.applyAuthorizationPolicy(
          group,
          community.authorization
        );
      group.authorization = savedGroup.authorization;
    }

    for (const application of community.applications) {
      const applicationSaved =
        await this.applicationAuthorizationService.applyAuthorizationPolicy(
          application,
          community.authorization
        );
      application.authorization = applicationSaved.authorization;
    }

    for (const invitation of community.invitations) {
      const invitationSaved =
        await this.invitationAuthorizationService.applyAuthorizationPolicy(
          invitation,
          community.authorization
        );
      invitation.authorization = invitationSaved.authorization;
    }

    for (const externalInvitation of community.externalInvitations) {
      const invitationSaved =
        await this.invitationExternalAuthorizationService.applyAuthorizationPolicy(
          externalInvitation,
          community.authorization
        );
      externalInvitation.authorization = invitationSaved.authorization;
    }

    community.guidelines =
      await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
        community.guidelines,
        community.authorization
      );

    return await this.communityRepository.save(community);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalCommunityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.COMMUNITY_ADD_MEMBER,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
          AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
        ],
        CREDENTIAL_RULE_TYPES_COMMUNITY_GLOBAL_ADMINS
      );
    newRules.push(globalCommunityAdmin);

    if (allowGlobalRegisteredReadAccess) {
      const globalRegistered =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.READ],
          [AuthorizationCredential.GLOBAL_REGISTERED],
          CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED
        );
      newRules.push(globalRegistered);
    }

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const communityInvitePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.COMMUNITY_INVITE],
      AuthorizationPrivilege.GRANT,
      POLICY_RULE_COMMUNITY_INVITE
    );
    privilegeRules.push(communityInvitePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  private appendVerifiedCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const verifiedCredentialRules: AuthorizationPolicyRuleVerifiedCredential[] =
      [];

    return this.authorizationPolicyService.appendVerifiedCredentialAuthorizationRules(
      authorization,
      verifiedCredentialRules
    );
  }

  public extendAuthorizationPolicyForSelfRemoval(
    community: ICommunity,
    userToBeRemovedID: string
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const userSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: userToBeRemovedID,
          },
        ],
        CREDENTIAL_RULE_COMMUNITY_SELF_REMOVAL
      );
    newRules.push(userSelfRemovalRule);

    const clonedCommunityAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        community.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedCommunityAuthorization,
        newRules
      );

    return updatedAuthorization;
  }
}
