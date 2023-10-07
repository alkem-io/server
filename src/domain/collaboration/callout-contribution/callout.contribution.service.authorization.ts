import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutContributionService } from './callout.contribution.service';
import { ICalloutContribution } from './callout.contribution.interface';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { PostAuthorizationService } from '../post/post.service.authorization';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';

@Injectable()
export class CalloutContributionAuthorizationService {
  constructor(
    private contributionService: CalloutContributionService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private postAuthorizationService: PostAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService
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

    return this.contributionService.save(contribution);
  }
}
