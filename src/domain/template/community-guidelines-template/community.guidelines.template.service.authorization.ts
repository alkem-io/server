import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { ITemplateBase } from '../template-base/template.base.interface';
import { CommunityGuidelinesTemplate } from './community.guidelines.template.entity';

@Injectable()
export class CommunityGuidelinesTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(CommunityGuidelinesTemplate)
    private communityGuidelinesTemplateRepository: Repository<CommunityGuidelinesTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communityGuidelinesTemplate: ITemplateBase,
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

    return await this.communityGuidelinesTemplateRepository.save(
      communityGuidelinesTemplate
    );
  }
}
