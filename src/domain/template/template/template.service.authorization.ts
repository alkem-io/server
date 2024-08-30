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

@Injectable()
export class TemplateAuthorizationService {
  constructor(
    private templateService: TemplateService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService
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

    if (template.type == TemplateType.COMMUNITY_GUIDELINES) {
      if (!template.communityGuidelines) {
        throw new RelationshipNotFoundException(
          `Unable to load Community Guidelines on Template of that type: ${template.id} `,
          LogContext.TEMPLATES
        );
      }
      // Cascade
      const guidelineAuthorizations =
        await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
          template.communityGuidelines,
          template.authorization
        );
      updatedAuthorizations.push(...guidelineAuthorizations);
    }

    if (template.type == TemplateType.CALLOUT) {
      if (!template.callout) {
        throw new RelationshipNotFoundException(
          `Unable to load Callout on Template of that type: ${template.id} `,
          LogContext.TEMPLATES
        );
      }
      // Cascade
      const calloutAuthorizations =
        await this.calloutAuthorizationService.applyAuthorizationPolicy(
          template.callout,
          template.authorization
        );
      updatedAuthorizations.push(...calloutAuthorizations);
    }

    if (template.type == TemplateType.WHITEBOARD) {
      if (!template.whiteboard) {
        throw new RelationshipNotFoundException(
          `Unable to load Whiteboard on Template of that type: ${template.id} `,
          LogContext.TEMPLATES
        );
      }
      // Cascade
      const whiteboardAuthorizations =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          template.whiteboard,
          template.authorization
        );
      updatedAuthorizations.push(...whiteboardAuthorizations);
    }

    return updatedAuthorizations;
  }
}
