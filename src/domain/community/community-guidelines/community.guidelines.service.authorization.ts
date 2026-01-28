import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Injectable } from '@nestjs/common';
import { ICommunityGuidelines } from './community.guidelines.interface';

@Injectable()
export class CommunityGuidelinesAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    communityGuidelines: ICommunityGuidelines,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Ensure always applying from a clean state
    communityGuidelines.authorization = this.authorizationPolicyService.reset(
      communityGuidelines.authorization
    );
    communityGuidelines.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communityGuidelines.authorization,
        parentAuthorization
      );
    // All content on community guidelines is public
    communityGuidelines.authorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        communityGuidelines.authorization,
        AuthorizationPrivilege.READ
      );
    updatedAuthorizations.push(communityGuidelines.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        communityGuidelines.profile.id,
        communityGuidelines.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }
}
