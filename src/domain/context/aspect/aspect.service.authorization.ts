import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DiscussionAuthorizationService } from '@domain/communication/discussion/discussion.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { IAspect } from './aspect.interface';
import { Aspect } from './aspect.entity';
import { LogContext } from '@common/enums';
import { AspectService } from './aspect.service';

@Injectable()
export class AspectAuthorizationService {
  constructor(
    private aspectService: AspectService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private discussionAuthorizationService: DiscussionAuthorizationService,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>
  ) {}

  async applyAuthorizationPolicy(
    aspect: IAspect,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential: ICredential
  ): Promise<IAspect> {
    aspect.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        aspect.authorization,
        parentAuthorization
      );

    aspect.authorization = this.appendCredentialRules(
      aspect.authorization,
      aspect.id,
      communityCredential
    );

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

    if (aspect.comments) {
      aspect.comments.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          aspect.comments.authorization,
          aspect.authorization
        );
    }

    aspect.references = await this.aspectService.getReferences(aspect);
    for (const reference of aspect.references) {
      reference.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          aspect.authorization
        );
    }

    return await this.aspectRepository.save(aspect);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    aspectID: string,
    communityCredential: ICredential
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Aspect: ${aspectID} ${communityCredential.type}`,
        LogContext.CONTEXT
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
