import { LogContext } from '@common/enums/logging.context';
import { TemplateType } from '@common/enums/template.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { CommunityGuidelinesAuthorizationService } from '@domain/community/community-guidelines/community.guidelines.service.authorization';
import { Injectable } from '@nestjs/common';
import { TemplateContentSpaceAuthorizationService } from '../template-content-space/template.content.space.service.authorization';
import { ITemplate } from './template.interface';
import { TemplateService } from './template.service';

@Injectable()
export class TemplateAuthorizationService {
  constructor(
    private templateService: TemplateService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private templateContentSpaceAuthorizationService: TemplateContentSpaceAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    templateInput: ITemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const template = await this.templateService.getTemplateOrFail(
      templateInput.id,
      {
        relations: {
          profile: true,
          communityGuidelines: {
            profile: true,
          },
          callout: {
            framing: {
              profile: true,
              whiteboard: {
                profile: true,
              },
            },
            contributionDefaults: true,
          },
          whiteboard: true,
          contentSpace: {
            authorization: true,
          },
        },
      }
    );
    if (!template.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile on Template: ${templateInput.id} `,
        LogContext.TEMPLATES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    template.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        template.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(template.authorization);

    // Cascade
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        template.profile.id,
        template.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    switch (template.type) {
      case TemplateType.COMMUNITY_GUIDELINES: {
        if (!template.communityGuidelines) {
          throw new RelationshipNotFoundException(
            `Unable to load Community Guidelines on Template of that type: ${template.id} `,
            LogContext.TEMPLATES
          );
        }
        const guidelineAuthorizations =
          await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
            template.communityGuidelines,
            template.authorization
          );
        updatedAuthorizations.push(...guidelineAuthorizations);
        break;
      }
      case TemplateType.CALLOUT: {
        if (!template.callout) {
          throw new RelationshipNotFoundException(
            `Unable to load Callout on Template of that type: ${template.id} `,
            LogContext.TEMPLATES
          );
        }
        const calloutAuthorizations =
          await this.calloutAuthorizationService.applyAuthorizationPolicy(
            template.callout.id,
            template.authorization,
            {
              roles: [],
            }
          );
        updatedAuthorizations.push(...calloutAuthorizations);
        break;
      }
      case TemplateType.WHITEBOARD: {
        if (!template.whiteboard) {
          throw new RelationshipNotFoundException(
            `Unable to load Whiteboard on Template of that type: ${template.id} `,
            LogContext.TEMPLATES
          );
        }
        const whiteboardAuthorizations =
          await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
            template.whiteboard.id,
            template.authorization
          );
        updatedAuthorizations.push(...whiteboardAuthorizations);
        break;
      }
      case TemplateType.SPACE: {
        if (!template.contentSpace) {
          throw new RelationshipNotFoundException(
            `Unable to load Space content on Template of that type: ${template.id} `,
            LogContext.TEMPLATES
          );
        }
        const spaceContentAuthorizations =
          await this.templateContentSpaceAuthorizationService.applyAuthorizationPolicy(
            template.contentSpace.id,
            template.authorization
          );
        updatedAuthorizations.push(...spaceContentAuthorizations);
        break;
      }
      case TemplateType.POST: {
        break;
      }
      default: {
        throw new EntityNotFoundException(
          `Unable to reset auth on template of type: ${template.type}`,
          LogContext.TEMPLATES
        );
      }
    }

    return updatedAuthorizations;
  }
}
