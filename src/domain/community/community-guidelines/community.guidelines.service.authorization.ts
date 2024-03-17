import { Injectable } from '@nestjs/common';
import { CommunityGuidelinesService } from './community.guidelines.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICommunityGuidelines } from './community.guidelines.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class CommunityGuidelinesAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private communityGuidelinesService: CommunityGuidelinesService
  ) {}

  async applyAuthorizationPolicy(
    communityGuidelines: ICommunityGuidelines,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICommunityGuidelines> {
    // Ensure always applying from a clean state
    communityGuidelines.authorization = this.authorizationPolicyService.reset(
      communityGuidelines.authorization
    );
    communityGuidelines.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communityGuidelines.authorization,
        parentAuthorization
      );

    communityGuidelines.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        communityGuidelines.profile,
        communityGuidelines.authorization
      );

    return await this.communityGuidelinesService.save(communityGuidelines);
  }
}
