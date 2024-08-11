import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSetService } from './templates.set.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
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
    private postTemplateAuthorizationService: PostTemplateAuthorizationService,
    private whiteboardTemplateAuthorizationService: WhiteboardTemplateAuthorizationService,
    private innovationFlowTemplateAuthorizationService: InnovationFlowTemplateAuthorizationService,
    private communityGuidelinesTemplateAuthorizationService: CommunityGuidelinesTemplateAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    templatesSetInput: ITemplatesSet,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templatesSetInput.id,
      {
        relations: {
          postTemplates: true,
          whiteboardTemplates: true,
          innovationFlowTemplates: true,
          communityGuidelinesTemplates: {
            guidelines: {
              profile: {
                authorization: true,
              },
            },
          },
        },
      }
    );

    // Inherit from the parent
    templatesSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        templatesSet.authorization,
        parentAuthorization
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    if (templatesSet.postTemplates) {
      for (const postTemplate of templatesSet.postTemplates) {
        const postAuthorizations =
          await this.postTemplateAuthorizationService.applyAuthorizationPolicy(
            postTemplate,
            parentAuthorization
          );
        updatedAuthorizations.push(...postAuthorizations);
      }
    }

    if (templatesSet.whiteboardTemplates) {
      for (const whiteboardTemplate of templatesSet.whiteboardTemplates) {
        const whiteboardAuthorizations =
          await this.whiteboardTemplateAuthorizationService.applyAuthorizationPolicy(
            whiteboardTemplate,
            parentAuthorization
          );
        updatedAuthorizations.push(...whiteboardAuthorizations);
      }
    }

    if (templatesSet.innovationFlowTemplates) {
      for (const innovationFlowTemplate of templatesSet.innovationFlowTemplates) {
        const flowAuthorizations =
          await this.innovationFlowTemplateAuthorizationService.applyAuthorizationPolicy(
            innovationFlowTemplate,
            parentAuthorization
          );
        updatedAuthorizations.push(...flowAuthorizations);
      }
    }

    if (templatesSet.communityGuidelinesTemplates) {
      for (const communityGuidelinesTemplate of templatesSet.communityGuidelinesTemplates) {
        const guidelinesAuthorizations =
          await this.communityGuidelinesTemplateAuthorizationService.applyAuthorizationPolicy(
            communityGuidelinesTemplate,
            parentAuthorization
          );
        updatedAuthorizations.push(...guidelinesAuthorizations);
      }
    }

    return updatedAuthorizations;
  }
}
