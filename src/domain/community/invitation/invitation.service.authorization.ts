import { Injectable } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IInvitation } from './invitation.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_COMMUNITY_USER_INVITATION as CREDENTIAL_RULE_COMMUNITY_CONTRIBUTOR_INVITATION } from '@common/constants/authorization/credential.rule.constants';
import { ContributorService } from '../contributor/contributor.service';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { VirtualContributorService } from '../virtual-contributor/virtual.contributor.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

@Injectable()
export class InvitationAuthorizationService {
  constructor(
    private invitationService: InvitationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private contributorService: ContributorService,
    private virtualContributorService: VirtualContributorService
  ) {}

  async applyAuthorizationPolicy(
    invitation: IInvitation,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IInvitation> {
    invitation.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        invitation.authorization,
        parentAuthorization
      );

    invitation.authorization = await this.extendAuthorizationPolicy(invitation);

    return invitation;
  }

  private async extendAuthorizationPolicy(
    invitation: IInvitation
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // get the user
    const contributor = await this.invitationService.getInvitedContributor(
      invitation
    );

    // also grant the user privileges to work with their own invitation
    const contributorType =
      this.contributorService.getContributorType(contributor);
    const criterias: ICredentialDefinition[] = [];
    switch (contributorType) {
      case CommunityContributorType.USER:
        criterias.push({
          type: AuthorizationCredential.USER_SELF_MANAGEMENT,
          resourceID: contributor.id,
        });
        break;
      case CommunityContributorType.ORGANIZATION:
        criterias.push({
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: contributor.id,
        });
        criterias.push({
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: contributor.id,
        });
        break;
      case CommunityContributorType.VIRTUAL:
        const vcHostCriterias =
          await this.virtualContributorService.getAccountHostCredentials(
            contributor.id
          );
        criterias.push(...vcHostCriterias);
        break;
    }

    const virtualInvitationRule =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.COMMUNITY_INVITE_ACCEPT,
        ],
        criterias,
        CREDENTIAL_RULE_COMMUNITY_CONTRIBUTOR_INVITATION
      );
    newRules.push(virtualInvitationRule);

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        invitation.authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
