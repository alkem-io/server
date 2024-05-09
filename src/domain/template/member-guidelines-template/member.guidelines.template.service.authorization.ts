import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { MemberGuidelinesTemplate } from './member.guidelines.template.entity';
import { IMemberGuidelinesTemplate } from './member.guidelines.template.interface';

@Injectable()
export class MemberGuidelinesTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(MemberGuidelinesTemplate)
    private memberGuidelinesTemplateRepository: Repository<MemberGuidelinesTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    memberGuidelinesTemplate: IMemberGuidelinesTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IMemberGuidelinesTemplate> {
    // Inherit from the parent
    memberGuidelinesTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        memberGuidelinesTemplate.authorization,
        parentAuthorization
      );
    // Cascade
    memberGuidelinesTemplate.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        memberGuidelinesTemplate.profile,
        memberGuidelinesTemplate.authorization
      );

    return await this.memberGuidelinesTemplateRepository.save(
      memberGuidelinesTemplate
    );
  }
}
