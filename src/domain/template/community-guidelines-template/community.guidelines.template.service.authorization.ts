import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { ITemplateBase } from '../template-base/template.base.interface';
import { CommunityGuidelinesTemplate } from './community.guidelines.template.entity';
import { ICommunityGuidelinesTemplate } from './community.guidelines.template.interface';
import { CommunityGuidelinesAuthorizationService } from '@domain/community/community-guidelines/community.guidelines.service.authorization';

@Injectable()
export class CommunityGuidelinesTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(CommunityGuidelinesTemplate)
    private communityGuidelinesTemplateRepository: Repository<CommunityGuidelinesTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communityGuidelinesTemplate: ICommunityGuidelinesTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ITemplateBase> {
    // Inherit from the parent
    communityGuidelinesTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communityGuidelinesTemplate.authorization,
        parentAuthorization
      );
    // Cascade
    communityGuidelinesTemplate.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        communityGuidelinesTemplate.profile,
        communityGuidelinesTemplate.authorization
      );

    // Cascade
    communityGuidelinesTemplate.guidelines =
      await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
        communityGuidelinesTemplate.guidelines,
        communityGuidelinesTemplate.authorization
      );

    return await this.communityGuidelinesTemplateRepository.save(
      communityGuidelinesTemplate
    );
  }
}
