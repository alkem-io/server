import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { ICommunityGuidelinesTemplate } from './community.guidelines.template.interface';
import { CommunityGuidelinesAuthorizationService } from '@domain/community/community-guidelines/community.guidelines.service.authorization';

@Injectable()
export class CommunityGuidelinesTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communityGuidelinesTemplate: ICommunityGuidelinesTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    communityGuidelinesTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communityGuidelinesTemplate.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(communityGuidelinesTemplate.authorization);

    // Cascade
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        communityGuidelinesTemplate.profile.id,
        communityGuidelinesTemplate.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    // Cascade
    const guidelineAuthorizations =
      await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
        communityGuidelinesTemplate.guidelines,
        communityGuidelinesTemplate.authorization
      );
    updatedAuthorizations.push(...guidelineAuthorizations);

    return updatedAuthorizations;
  }
}
