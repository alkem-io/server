import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutContributionService } from './callout.contribution.service';
import { ICalloutContribution } from './callout.contribution.interface';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { PostAuthorizationService } from '../post/post.service.authorization';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { EntityNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CommunityRole } from '@common/enums/community.role';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { CREDENTIAL_RULE_CONTRIBUTION_ADMINS_MOVE } from '@common/constants';

@Injectable()
export class CalloutContributionAuthorizationService {
  constructor(
    private contributionService: CalloutContributionService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private postAuthorizationService: PostAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private communityPolicyService: CommunityPolicyService
  ) {}

  public async applyAuthorizationPolicy(
    contributionInput: ICalloutContribution,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.contributionService.getCalloutContributionOrFail(
        contributionInput.id,
        {
          relations: {
            post: true,
            whiteboard: true,
            link: true,
          },
        }
      );

    contribution.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        contribution.authorization,
        parentAuthorization
      );

    if (contribution.post) {
      contribution.post =
        await this.postAuthorizationService.applyAuthorizationPolicy(
          contribution.post,
          contribution.authorization,
          communityPolicy
        );
    }
    if (contribution.whiteboard) {
      contribution.whiteboard =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          contribution.whiteboard,
          contribution.authorization
        );
    }

    if (contribution.link) {
      contribution.link.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          contribution.link.authorization,
          contribution.authorization
        );
    }

    // Extend to give the user creating the contribution more rights
    contribution.authorization = this.appendCredentialRules(
      contribution,
      communityPolicy
    );

    return this.contributionService.save(contribution);
  }

  private appendCredentialRules(
    contribution: ICalloutContribution,
    communityPolicy: ICommunityPolicy
  ): IAuthorizationPolicy {
    const authorization = contribution.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Contribution: ${contribution.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow space admins to move post
    const credentials = this.communityPolicyService.getAllCredentialsForRole(
      communityPolicy,
      CommunityRole.ADMIN
    );
    credentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    credentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN_SPACES,
      resourceID: '',
    });
    const adminsMoveContributionRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.MOVE_CONTRIBUTION],
        credentials,
        CREDENTIAL_RULE_CONTRIBUTION_ADMINS_MOVE
      );
    adminsMoveContributionRule.cascade = false;
    newRules.push(adminsMoveContributionRule);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
