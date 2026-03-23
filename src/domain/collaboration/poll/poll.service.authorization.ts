import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import {
  AuthorizationPolicy,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { IPoll } from './poll.interface';
import { PollService } from './poll.service';

@Injectable()
export class PollAuthorizationService {
  constructor(
    private pollService: PollService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  public async applyAuthorizationPolicy(
    pollInput: IPoll,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const poll = await this.pollService.getPollOrFail(pollInput.id);

    if (!poll.authorization) {
      throw new RelationshipNotFoundException(
        'Unable to load authorization on poll',
        LogContext.COLLABORATION,
        { pollId: poll.id }
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit READ/CONTRIBUTE/UPDATE from parent CalloutFraming policy
    // This means space members who can contribute to the callout can vote,
    // and editors who can update the callout can manage poll options
    poll.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        poll.authorization,
        parentAuthorization
      ) as AuthorizationPolicy;
    updatedAuthorizations.push(poll.authorization);

    return updatedAuthorizations;
  }
}
