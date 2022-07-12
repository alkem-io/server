import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { IAspect } from './aspect.interface';
import { Aspect } from './aspect.entity';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AspectService } from './aspect.service';
import { CommentsAuthorizationService } from '@domain/communication/comments/comments.service.authorization';

@Injectable()
export class AspectAuthorizationService {
  constructor(
    private aspectService: AspectService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>
  ) {}

  async applyAuthorizationPolicy(
    aspect: IAspect,
    parentAuthorization: IAuthorizationPolicy | undefined
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
    aspect.authorization = this.appendCredentialRules(aspect);

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

    aspect.references = await this.aspectService.getReferences(aspect);
    for (const reference of aspect.references) {
      reference.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          aspect.authorization
        );
    }

    return await this.aspectRepository.save(aspect);
  }

  private appendCredentialRules(aspect: IAspect): IAuthorizationPolicy {
    const authorization = aspect.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Aspect: ${aspect.id}`,
        LogContext.CONTEXT
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const messageSender = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.USER_SELF_MANAGEMENT,
      aspect.createdBy
    );
    newRules.push(messageSender);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
