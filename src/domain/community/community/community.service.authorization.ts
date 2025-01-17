import { Injectable } from '@nestjs/common';
import { CommunityService } from './community.service';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { CommunicationAuthorizationService } from '@domain/communication/communication/communication.service.authorization';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED } from '@common/constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityGuidelinesAuthorizationService } from '../community-guidelines/community.guidelines.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communityID: string,
    parentAuthorization: IAuthorizationPolicy,
    spaceSettings: ISpaceSettings,
    spaceMembershipAllowed: boolean,
    isSubspace: boolean
  ): Promise<IAuthorizationPolicy[]> {
    const community = await this.communityService.getCommunityOrFail(
      communityID,
      {
        relations: {
          communication: {
            updates: true,
          },
          roleSet: true,
          groups: true,
          guidelines: {
            profile: true,
          },
        },
      }
    );
    if (
      !community.communication ||
      !community.communication.updates ||
      !community.roleSet ||
      !community.groups
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for community authorization: ${community.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    community.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        community.authorization,
        parentAuthorization
      );

    community.authorization = await this.extendAuthorizationPolicy(
      community.authorization,
      spaceSettings.privacy.mode === 'public'
    );

    updatedAuthorizations.push(community.authorization);

    const communicationAuthorizations =
      await this.communicationAuthorizationService.applyAuthorizationPolicy(
        community.communication,
        community.authorization
      );
    updatedAuthorizations.push(...communicationAuthorizations);

    // cascade
    for (const group of community.groups) {
      const groupAuthorizations =
        await this.userGroupAuthorizationService.applyAuthorizationPolicy(
          group,
          community.authorization
        );
      updatedAuthorizations.push(...groupAuthorizations);
    }

    const roleSetAuthorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicy(
        community.roleSet.id,
        community.authorization,
        spaceSettings,
        spaceMembershipAllowed,
        isSubspace
      );
    updatedAuthorizations.push(...roleSetAuthorizations);

    if (community.guidelines) {
      const guidelineAuthorizations =
        await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
          community.guidelines,
          community.authorization
        );
      updatedAuthorizations.push(...guidelineAuthorizations);
    }

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (allowGlobalRegisteredReadAccess) {
      const globalRegistered =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.READ],
          [AuthorizationCredential.GLOBAL_REGISTERED],
          CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED
        );
      globalRegistered.cascade = true;
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
}
