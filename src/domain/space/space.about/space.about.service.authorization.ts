import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InheritedCredentialRuleSetService } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CommunityGuidelinesAuthorizationService } from '@domain/community/community-guidelines/community.guidelines.service.authorization';
import { Injectable } from '@nestjs/common';
import { SpaceAboutService } from './space.about.service';
@Injectable()
export class SpaceAboutAuthorizationService {
  constructor(
    private profileAuthorizationService: ProfileAuthorizationService,
    private spaceAboutService: SpaceAboutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private inheritedCredentialRuleSetService: InheritedCredentialRuleSetService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    spaceAboutID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
    const spaceAbout = await this.spaceAboutService.getSpaceAboutOrFail(
      spaceAboutID,
      {
        relations: {
          profile: true,
          guidelines: {
            profile: true,
          },
        },
      }
    );
    if (
      !spaceAbout.guidelines ||
      !spaceAbout.guidelines.profile ||
      !spaceAbout.profile
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for SpaceAbout authorization: ${spaceAboutID} `,
        LogContext.SPACE_ABOUT
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    spaceAbout.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        spaceAbout.authorization,
        parentAuthorization
      );
    spaceAbout.authorization.credentialRules.push(...credentialRulesFromParent);
    updatedAuthorizations.push(spaceAbout.authorization);

    await this.inheritedCredentialRuleSetService.resolveForParent(
      spaceAbout.authorization
    );

    // cascade
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        spaceAbout.profile.id,
        spaceAbout.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const guidelineAuthorizations =
      await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
        spaceAbout.guidelines,
        spaceAbout.authorization
      );
    updatedAuthorizations.push(...guidelineAuthorizations);

    return updatedAuthorizations;
  }
}
