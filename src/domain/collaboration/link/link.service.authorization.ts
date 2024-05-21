import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { LinkService } from './link.service';
import { ILink } from './link.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CREDENTIAL_RULE_LINK_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';

@Injectable()
export class LinkAuthorizationService {
  constructor(
    private linkService: LinkService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    link: ILink,
    parentAuthorization: IAuthorizationPolicy | undefined,
    createdByID?: string
  ): Promise<ILink> {
    if (!link.profile)
      throw new RelationshipNotFoundException(
        `Unable to load entities on link:  ${link.id} `,
        LogContext.COLLABORATION
      );
    link.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        link.authorization,
        parentAuthorization
      );
    link.authorization = this.appendCredentialRules(link, createdByID);
    link.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        link.profile,
        link.authorization
      );

    return link;
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
