import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { KnowledgeBaseService } from './knowledge.base.service';
import { IKnowledgeBase } from './knowledge.base.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { CalloutsSetAuthorizationService } from '@domain/collaboration/callouts-set/callouts.set.service.authorization';

@Injectable()
export class KnowledgeBaseAuthorizationService {
  constructor(
    private knowledgeBaseService: KnowledgeBaseService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private calloutsSetAuthorizationService: CalloutsSetAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    knowledgeBaseInput: IKnowledgeBase,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const knowledgeBase =
      await this.knowledgeBaseService.getKnowledgeBaseOrFail(
        knowledgeBaseInput.id,
        {
          relations: {
            authorization: true,
            profile: true,
            calloutsSet: true,
          },
        }
      );

    if (!knowledgeBase.profile || !knowledgeBase.calloutsSet) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile of CalloutsSet on knowledgeBase:  ${knowledgeBase.id} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    knowledgeBase.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        knowledgeBase.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(knowledgeBase.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        knowledgeBase.profile.id,
        knowledgeBase.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const calloutsSetAuthorizations =
      await this.calloutsSetAuthorizationService.applyAuthorizationPolicy(
        knowledgeBase.calloutsSet,
        knowledgeBase.authorization
      );
    updatedAuthorizations.push(...calloutsSetAuthorizations);

    return updatedAuthorizations;
  }
}
