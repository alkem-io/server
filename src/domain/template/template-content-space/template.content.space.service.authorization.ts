import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceAboutAuthorizationService } from '@domain/space/space.about/space.about.service.authorization';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateContentSpaceService } from './template.content.space.service';

@Injectable()
export class TemplateContentSpaceAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private spaceAboutAuthorizationService: SpaceAboutAuthorizationService,
    private templateContentSpaceService: TemplateContentSpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    templateContentSpaceID: string,
    providedParentAuthorization: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy[]> {
    const templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        templateContentSpaceID,
        {
          relations: {
            authorization: true,
            collaboration: true,
            about: {
              profile: true,
            },
            subspaces: true,
          },
        }
      );
    if (
      !templateContentSpace.authorization ||
      !templateContentSpace.collaboration ||
      !templateContentSpace.about ||
      !templateContentSpace.subspaces
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load TemplateContentSpace with entities at start of auth reset: ${templateContentSpace.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Cascade to templateContentSpace.authorization
    templateContentSpace.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        templateContentSpace.authorization,
        providedParentAuthorization
      );
    updatedAuthorizations.push(templateContentSpace.authorization);

    // Cascade to collaboration
    const collaborationAuths =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.collaboration,
        templateContentSpace.authorization,
        {
          roles: [],
        }
      );
    updatedAuthorizations.push(...collaborationAuths);

    // Cascade to about
    const aboutAuths =
      await this.spaceAboutAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.about.id,
        templateContentSpace.authorization
      );
    updatedAuthorizations.push(...aboutAuths);

    for (const subspace of templateContentSpace.subspaces) {
      // Cascade to subspaces
      const subspaceAuths = await this.applyAuthorizationPolicy(
        subspace.id,
        templateContentSpace.authorization
      );
      updatedAuthorizations.push(...subspaceAuths);
    }

    return updatedAuthorizations;
  }
}
