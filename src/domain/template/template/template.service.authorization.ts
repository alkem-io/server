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

@Injectable()
export class TemplateAuthorizationService {
  constructor(
    private templateService: TemplateService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService
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
          guidelines: {
            profile: true,
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
        template.profile,
        template.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    if (template.type == TemplateType.COMMUNITY_GUIDELINES) {
      if (!template.guidelines) {
        throw new RelationshipNotFoundException(
          `Unable to load Community Guidelines on Template of that type: ${template.id} `,
          LogContext.TEMPLATES
        );
      }
      // Cascade
      const guidelineAuthorizations =
        await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
          template.guidelines,
          template.authorization
        );
      updatedAuthorizations.push(...guidelineAuthorizations);
    }

    return updatedAuthorizations;
  }
}
