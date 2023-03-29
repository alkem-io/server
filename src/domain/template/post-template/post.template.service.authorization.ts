import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostTemplate } from './post.template.entity';
import { IPostTemplate } from './post.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class PostTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(PostTemplate)
    private postTemplateRepository: Repository<PostTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    postTemplate: IPostTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IPostTemplate> {
    // Inherit from the parent
    postTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        postTemplate.authorization,
        parentAuthorization
      );
    // Cascade
    postTemplate.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        postTemplate.profile,
        postTemplate.authorization
      );

    return await this.postTemplateRepository.save(postTemplate);
  }
}
