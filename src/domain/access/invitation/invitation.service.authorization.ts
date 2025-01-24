import { Injectable } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IInvitation } from './invitation.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { CREDENTIAL_RULE_ROLESET_INVITATION } from '@common/constants';

@Injectable()
export class InvitationAuthorizationService {
  constructor(
    private invitationService: InvitationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private contributorService: ContributorService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private accountLookupService: AccountLookupService
  ) {}

  async applyAuthorizationPolicy(
    invitation: IInvitation,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    invitation.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        invitation.authorization,
        parentAuthorization
      );

    invitation.authorization = await this.extendAuthorizationPolicy(invitation);

    return invitation.authorization;
  }

  private async extendAuthorizationPolicy(
    invitation: IInvitation
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // get the user
    const contributor =
      await this.invitationService.getInvitedContributor(invitation);

    // also grant the user privileges to work with their own invitation
    const contributorType =
      this.contributorService.getContributorType(contributor);
    const criterias: ICredentialDefinition[] = [];
    switch (contributorType) {
      case RoleSetContributorType.USER:
        criterias.push({
          type: AuthorizationCredential.USER_SELF_MANAGEMENT,
          resourceID: contributor.id,
        });
        break;
      case RoleSetContributorType.ORGANIZATION:
        criterias.push({
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: contributor.id,
        });
        criterias.push({
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: contributor.id,
        });
        break;
      case RoleSetContributorType.VIRTUAL:
        const account =
          await this.virtualContributorLookupService.getAccountOrFail(
            contributor.id
          );
        const vcHostCriterias =
          await this.accountLookupService.getHostCredentials(account);

        criterias.push(...vcHostCriterias);
        break;
    }

    const virtualInvitationRule =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE_ACCEPT,
        ],
        criterias,
        CREDENTIAL_RULE_ROLESET_INVITATION
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
