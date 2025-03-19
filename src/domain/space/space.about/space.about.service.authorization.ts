import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CommunityGuidelinesAuthorizationService } from '@domain/community/community-guidelines/community.guidelines.service.authorization';
import { SpaceAboutService } from './space.about.service';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
@Injectable()
export class SpaceAboutAuthorizationService {
  constructor(
    private profileAuthorizationService: ProfileAuthorizationService,
    private spaceAboutService: SpaceAboutService,
    private authorizationPolicyService: AuthorizationPolicyService,
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
