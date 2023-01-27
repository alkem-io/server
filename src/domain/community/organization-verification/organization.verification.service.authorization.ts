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
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

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

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
          AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
        ],
        'organizationGlobalAdminsAll'
      );
    newRules.push(globalAdmin);

    const orgAdmin = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ, AuthorizationPrivilege.UPDATE],
      [
        {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: organizationID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: organizationID,
        },
      ]
    );
    newRules.push(orgAdmin);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
