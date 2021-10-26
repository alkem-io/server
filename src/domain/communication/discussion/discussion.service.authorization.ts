import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { IDiscussion } from './discussion.interface';
import { Discussion } from './discussion.entity';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

@Injectable()
export class DiscussionAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>
  ) {}

  async applyAuthorizationPolicy(
    discussion: IDiscussion,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IDiscussion> {
    discussion.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        discussion.authorization,
        parentAuthorization
      );

    discussion.authorization = this.extendAuthorizationPolicy(
      discussion.authorization
    );

    return await this.discussionRepository.save(discussion);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    // Allow any registered users to create new messages on discussions
    const globalRegistered = {
      type: AuthorizationCredential.GLOBAL_REGISTERED,
      resourceID: '',
      grantedPrivileges: [AuthorizationPrivilege.CREATE],
    };
    newRules.push(globalRegistered);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
