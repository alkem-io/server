import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSetService } from './templates.set.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from '.';
import { InnovationFlowTemplateAuthorizationService } from '../innovation-flow-template/innovation.flow.template.service.authorization';
import { WhiteboardTemplateAuthorizationService } from '../whiteboard-template/whiteboard.template.service.authorization';
import { PostTemplateAuthorizationService } from '../post-template/post.template.service.authorization';
import { CommunityGuidelinesTemplateAuthorizationService } from '../community-guidelines-template/community.guidelines.template.service.authorization';

@Injectable()
export class TemplatesSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private postTemplateAuthorizationService: PostTemplateAuthorizationService,
    private whiteboardTemplateAuthorizationService: WhiteboardTemplateAuthorizationService,
    private innovationFlowTemplateAuthorizationService: InnovationFlowTemplateAuthorizationService,
    private communityGuidelinesTemplateAuthorizationService: CommunityGuidelinesTemplateAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    templatesSetInput: ITemplatesSet,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ITemplatesSet> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templatesSetInput.id,
      {
        relations: {
          postTemplates: true,
          whiteboardTemplates: true,
          innovationFlowTemplates: true,
          communityGuidelinesTemplates: true,
        },
      }
    );

    // Inherit from the parent
    templatesSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        templatesSet.authorization,
        parentAuthorization
      );

    if (templatesSet.postTemplates) {
      for (const postTemplate of templatesSet.postTemplates) {
        await this.postTemplateAuthorizationService.applyAuthorizationPolicy(
          postTemplate,
          parentAuthorization
        );
      }
    }

    if (templatesSet.whiteboardTemplates) {
      for (const whiteboardTemplate of templatesSet.whiteboardTemplates) {
        await this.whiteboardTemplateAuthorizationService.applyAuthorizationPolicy(
          whiteboardTemplate,
          parentAuthorization
        );
      }
    }

    if (templatesSet.innovationFlowTemplates) {
      for (const innovationFlowTemplate of templatesSet.innovationFlowTemplates) {
        await this.innovationFlowTemplateAuthorizationService.applyAuthorizationPolicy(
          innovationFlowTemplate,
          parentAuthorization
        );
      }
    }

    if (templatesSet.communityGuidelinesTemplates) {
      for (const communityGuidelinesTemplate of templatesSet.communityGuidelinesTemplates) {
        await this.communityGuidelinesTemplateAuthorizationService.applyAuthorizationPolicy(
          communityGuidelinesTemplate,
          parentAuthorization
        );
      }
    }

    return await this.templatesSetRepository.save(templatesSet);
  }
}
