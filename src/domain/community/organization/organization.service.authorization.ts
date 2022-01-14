import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { IOrganization, Organization } from '@domain/community/organization';
import { ProfileAuthorizationService } from '@domain/community/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { OrganizationService } from './organization.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { OrganizationVerificationAuthorizationService } from '../organization-verification/organization.verification.service.authorization';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class OrganizationAuthorizationService {
  constructor(
    private organizationService: OrganizationService,
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private organizationVerificationAuthorizationService: OrganizationVerificationAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>
  ) {}

  async applyAuthorizationPolicy(
    organization: IOrganization
  ): Promise<IOrganization> {
    organization.authorization = await this.authorizationPolicyService.reset(
      organization.authorization
    );
    organization.authorization =
      this.authorizationPolicyService.inheritPlatformAuthorization(
        organization.authorization
      );
    organization.authorization = this.appendCredentialRules(
      organization.authorization,
      organization.id
    );

    if (organization.profile) {
      organization.profile.authorization =
        this.authorizationPolicy.inheritParentAuthorization(
          organization.profile.authorization,
          organization.authorization
        );
      organization.profile =
        await this.profileAuthorizationService.applyAuthorizationPolicy(
          organization.profile
        );
    }

    organization.agent = await this.organizationService.getAgent(organization);
    organization.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        organization.agent.authorization,
        organization.authorization
      );

    organization.groups = await this.organizationService.getUserGroups(
      organization
    );
    for (const group of organization.groups) {
      const savedGroup =
        await this.userGroupAuthorizationService.applyAuthorizationPolicy(
          group,
          organization.authorization
        );
      group.authorization = savedGroup.authorization;
    }

    organization.verification = await this.organizationService.getVerification(
      organization
    );
    organization.verification =
      await this.organizationVerificationAuthorizationService.applyAuthorizationPolicy(
        organization.verification,
        organization.id
      );

    return await this.organizationRepository.save(organization);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    organizationID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for organization: ${organizationID}`,
        LogContext.COMMUNITY
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const communityAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY
    );
    newRules.push(communityAdmin);

    const organizationAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.ORGANIZATION_ADMIN,
      organizationID
    );

    newRules.push(organizationAdmin);

    const organizationOwner = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.ORGANIZATION_OWNER,
      organizationID
    );
    newRules.push(organizationOwner);

    const organizationMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.ORGANIZATION_MEMBER,
      organizationID
    );
    newRules.push(organizationMember);

    const registeredUser = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.GLOBAL_REGISTERED
    );

    newRules.push(registeredUser);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
