import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IInvitation } from './invitation.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { CREDENTIAL_RULE_ROLESET_INVITATION } from '@common/constants';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { getContributorType } from '@domain/community/contributor/get.contributor.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class InvitationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private contributorService: ContributorService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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

    // get the contributor - may be null if orphaned
    const contributor = await this.contributorService.getContributor(
      invitation.invitedContributorID
    );

    if (!contributor) {
      // Orphaned invitation - contributor no longer exists
      // Log warning and skip adding custom authorization rules
      this.logger.warn(
        {
          message: 'Invitation references non-existent contributor',
          invitationId: invitation.id,
          contributorId: invitation.invitedContributorID,
        },
        LogContext.COMMUNITY
      );
      return invitation.authorization!;
    }

    // also grant the user privileges to work with their own invitation
    let accountID: string | undefined = undefined;
    const contributorType = getContributorType(contributor);
    const criterias: ICredentialDefinition[] = [];
    switch (contributorType) {
      case RoleSetContributorType.USER:
        accountID = (contributor as User).accountID;
        break;
      case RoleSetContributorType.ORGANIZATION:
        accountID = (contributor as Organization).accountID;
        break;
      case RoleSetContributorType.VIRTUAL:
        const account =
          await this.virtualContributorLookupService.getAccountOrFail(
            contributor.id
          );
        accountID = account.id;
        break;
    }
    if (!accountID) {
      throw new RoleSetMembershipException(
        `Unable to find account for contributor: ${contributor.id}`,
        LogContext.ROLES
      );
    }

    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: accountID,
    };
    criterias.push(accountAdminCredential);

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
