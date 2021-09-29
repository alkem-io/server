import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerification } from './organization.verification.entity';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class OrganizationVerificationAuthorizationService {
  constructor(
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(OrganizationVerification)
    private organizationVerificationRepository: Repository<OrganizationVerification>
  ) {}

  async applyAuthorizationPolicy(
    organizationVerification: IOrganizationVerification,
    organizationID: string
  ): Promise<IOrganizationVerification> {
    organizationVerification.authorization =
      await this.authorizationPolicyService.reset(
        organizationVerification.authorization
      );
    organizationVerification.authorization = this.appendCredentialRules(
      organizationVerification.authorization,
      organizationVerification.id,
      organizationID
    );

    return await this.organizationVerificationRepository.save(
      organizationVerification
    );
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    organizationVerificationID: string,
    organizationID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for organization verification: ${organizationVerificationID}`,
        LogContext.COMMUNITY
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const globalAdmin = {
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(globalAdmin);

    const communityAdmin = {
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(communityAdmin);

    const orgAdmin = {
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: organizationID,
      grantedPrivileges: [
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
    };
    newRules.push(orgAdmin);

    const orgOwner = {
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: organizationID,
      grantedPrivileges: [
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
    };
    newRules.push(orgOwner);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
