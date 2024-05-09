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
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_COMMUNITY_GLOBAL_ADMINS as CREDENTIAL_RULE_TYPES_GLOBAL_ADMINS_ADD_MEMBERS,
  CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_COMMUNITY_SELF_REMOVAL,
  CREDENTIAL_RULE_TYPES_ACCESS_VIRTUAL_CONTRIBUTORS,
} from '@common/constants';
import { InvitationExternalAuthorizationService } from '../invitation.external/invitation.external.service.authorization';
import { InvitationAuthorizationService } from '../invitation/invitation.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityGuidelinesAuthorizationService } from '../community-guidelines/community.guidelines.service.authorization';
import { ILicense } from '@domain/license/license/license.interface';
import { CommunityPolicyService } from '../community-policy/community.policy.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { CommunityRole } from '@common/enums/community.role';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicensePrivilege } from '@common/enums/license.privilege';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private licenseEngineService: LicenseEngineService,
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private invitationExternalAuthorizationService: InvitationExternalAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>
  ) {}

  async applyAuthorizationPolicy(
    communityInput: ICommunity,
    parentAuthorization: IAuthorizationPolicy | undefined,
    license: ILicense,
    communityPolicy: ICommunityPolicy
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
      !community.externalInvitations
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

    community.authorization = await this.extendAuthorizationPolicy(
      community.authorization,
      parentAuthorization?.anonymousReadAccess,
      license,
      communityPolicy
    );
    community.authorization = this.appendVerifiedCredentialRules(
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

    if (community.guidelines) {
      community.guidelines =
        await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
          community.guidelines,
          community.authorization
        );
    }

    return await this.communityRepository.save(community);
  }

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined,
    license: ILicense,
    policy: ICommunityPolicy
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalAdminAddMembers =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.COMMUNITY_ADD_MEMBER],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_GLOBAL_ADMINS_ADD_MEMBERS
      );
    newRules.push(globalAdminAddMembers);

    if (allowGlobalRegisteredReadAccess) {
      const globalRegistered =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.READ],
          [AuthorizationCredential.GLOBAL_REGISTERED],
          CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED
        );
      newRules.push(globalRegistered);
    }

    const accessVirtualContributors =
      await this.licenseEngineService.isAccessGranted(
        LicensePrivilege.VIRTUAL_CONTRIBUTOR_ACCESS,
        license
      );
    if (accessVirtualContributors) {
      const criterias: ICredentialDefinition[] =
        this.communityPolicyService.getCredentialsForRoleWithParents(
          policy,
          CommunityRole.ADMIN
        );
      criterias.push({
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: '',
      });
      const accessVCsRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.ACCESS_VIRTUAL_CONTRIBUTOR],
          criterias,
          CREDENTIAL_RULE_TYPES_ACCESS_VIRTUAL_CONTRIBUTORS
        );
      accessVCsRule.cascade = true; // TODO: ideally make this not cascade so it is more specific
      newRules.push(accessVCsRule);
    }

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
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
