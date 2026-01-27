import { CREDENTIAL_RULE_LINK_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Injectable } from '@nestjs/common';
import { ILink } from './link.interface';

@Injectable()
export class LinkAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    link: ILink,
    parentAuthorization: IAuthorizationPolicy | undefined,
    createdByID?: string
  ): Promise<IAuthorizationPolicy[]> {
    if (!link.profile)
      throw new RelationshipNotFoundException(
        `Unable to load entities on link:  ${link.id} `,
        LogContext.COLLABORATION
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    link.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        link.authorization,
        parentAuthorization
      );
    link.authorization = this.appendCredentialRules(link, createdByID);
    updatedAuthorizations.push(link.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        link.profile.id,
        link.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    link: ILink,
    createdByID?: string
  ): IAuthorizationPolicy {
    const authorization = link.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Link: ${link.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (createdByID) {
      const manageCreatedPostPolicy =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.DELETE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: createdByID,
            },
          ],
          CREDENTIAL_RULE_LINK_CREATED_BY
        );
      newRules.push(manageCreatedPostPolicy);
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
