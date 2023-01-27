import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAspect } from './aspect.interface';
import { Aspect } from './aspect.entity';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AspectService } from './aspect.service';
import { CommentsAuthorizationService } from '@domain/communication/comments/comments.service.authorization';
import { CardProfileAuthorizationService } from '../card-profile/card.profile.service.authorization';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

@Injectable()
export class AspectAuthorizationService {
  constructor(
    private aspectService: AspectService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private cardProfileAuthorizationService: CardProfileAuthorizationService,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>
  ) {}

  async applyAuthorizationPolicy(
    aspect: IAspect,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
  ): Promise<IAspect> {
    aspect.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        aspect.authorization,
        parentAuthorization
      );

    // Inherit for comments before extending so that the creating user does not
    // have rights to delete comments
    if (aspect.comments) {
      aspect.comments =
        await this.commentsAuthorizationService.applyAuthorizationPolicy(
          aspect.comments,
          aspect.authorization
        );
    }

    // Extend to give the user creating the aspect more rights
    aspect.authorization = this.appendCredentialRules(aspect, communityPolicy);

    // cascade
    if (aspect.banner) {
      aspect.banner.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          aspect.banner.authorization,
          aspect.authorization
        );
    }
    if (aspect.bannerNarrow) {
      aspect.bannerNarrow.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          aspect.bannerNarrow.authorization,
          aspect.authorization
        );
    }

    aspect.profile = await this.aspectService.getCardProfile(aspect);
    aspect.profile =
      await this.cardProfileAuthorizationService.applyAuthorizationPolicy(
        aspect.profile,
        aspect.authorization
      );

    return await this.aspectRepository.save(aspect);
  }

  private appendCredentialRules(
    aspect: IAspect,
    communityPolicy: ICommunityPolicy
  ): IAuthorizationPolicy {
    const authorization = aspect.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Aspect: ${aspect.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const manageCreatedAspectPolicy =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: aspect.createdBy,
          },
        ],
        'aspectCreatedBy'
      );
    newRules.push(manageCreatedAspectPolicy);

    // Allow hub admins to move card
    const credentials =
      this.communityPolicyService.getAdminCredentials(communityPolicy);
    credentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    credentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN_HUBS,
      resourceID: '',
    });
    const adminsMoveCardRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.MOVE_CARD],
        credentials,
        'aspectAdminsMoveCard'
      );
    adminsMoveCardRule.inheritable = false;
    newRules.push(adminsMoveCardRule);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
