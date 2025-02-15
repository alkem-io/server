import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { POLICY_RULE_READ_ABOUT } from '@common/constants/authorization/policy.rule.constants';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ISpaceAbout } from './space.about.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
@Injectable()
export class SpaceAboutAuthorizationService {
  constructor(
    private profileAuthorizationService: ProfileAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  async applyAuthorizationPolicy(
    spaceAbout: ISpaceAbout,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    spaceAbout.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        spaceAbout.authorization,
        parentAuthorization
      );

    // If can READ_ABOUT on SpaceAbout, then also allow general READ
    spaceAbout.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        spaceAbout.authorization,
        AuthorizationPrivilege.READ_ABOUT,
        [AuthorizationPrivilege.READ],
        POLICY_RULE_READ_ABOUT
      );
    spaceAbout.authorization.credentialRules.push(...credentialRulesFromParent);
    updatedAuthorizations.push(spaceAbout.authorization);

    // cascade
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        spaceAbout.profile.id,
        spaceAbout.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }
}
