import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ITemplate } from './template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CommunityGuidelinesAuthorizationService } from '@domain/community/community-guidelines/community.guidelines.service.authorization';
import { TemplateType } from '@common/enums/template.type';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { TemplateService } from './template.service';
import { LogContext } from '@common/enums/logging.context';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { InnovationFlowAuthorizationService } from '@domain/collaboration/innovation-flow/innovation.flow.service.authorization';

@Injectable()
export class TemplateAuthorizationService {
  constructor(
    private templateService: TemplateService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private innovationFlowAuthorizationService: InnovationFlowAuthorizationService
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
            contributionPolicy: true,
            contributionDefaults: true,
          },
          whiteboard: true,
          collaboration: {
            authorization: true,
          },
          innovationFlow: {
            profile: true,
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
      case TemplateType.COMMUNITY_GUIDELINES:
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
      case TemplateType.CALLOUT:
        if (!template.callout) {
          throw new RelationshipNotFoundException(
            `Unable to load Callout on Template of that type: ${template.id} `,
            LogContext.TEMPLATES
          );
        }
        const calloutAuthorizations =
          await this.calloutAuthorizationService.applyAuthorizationPolicy(
            template.callout.id,
            template.authorization
          );
        updatedAuthorizations.push(...calloutAuthorizations);
        break;
      case TemplateType.WHITEBOARD:
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
      case TemplateType.COLLABORATION:
        if (!template.collaboration) {
          throw new RelationshipNotFoundException(
            `Unable to load Collaboration on Template of that type: ${template.id} `,
            LogContext.TEMPLATES
          );
        }
        const collaborationAuthorizations =
          await this.collaborationAuthorizationService.applyAuthorizationPolicy(
            template.collaboration,
            template.authorization
          );
        updatedAuthorizations.push(...collaborationAuthorizations);
        break;
      case TemplateType.INNOVATION_FLOW:
        if (!template.innovationFlow) {
          throw new RelationshipNotFoundException(
            `Unable to load InnovationFlow on Template of that type: ${template.id} `,
            LogContext.TEMPLATES
          );
        }
        const innovationFlowAuthorizations =
          await this.innovationFlowAuthorizationService.applyAuthorizationPolicy(
            template.innovationFlow,
            template.authorization
          );
        updatedAuthorizations.push(...innovationFlowAuthorizations);
        break;
      case TemplateType.POST:
        break;
      default:
        throw new EntityNotFoundException(
          `Unable to reset auth on template of type: ${template.type}`,
          LogContext.TEMPLATES
        );
    }

    if (template.type == TemplateType.INNOVATION_FLOW) {
      if (!template.innovationFlow) {
        throw new RelationshipNotFoundException(
          `Unable to load InnovationFlow on Template of that type: ${template.id} `,
          LogContext.TEMPLATES
        );
      }
      // Cascade
      const innovationFlowAuthorizations =
        await this.innovationFlowAuthorizationService.applyAuthorizationPolicy(
          template.innovationFlow,
          template.authorization
        );
      updatedAuthorizations.push(...innovationFlowAuthorizations);
    }

    return updatedAuthorizations;
  }
}
