import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { Community } from '@domain/community/community';
import { ChallengeBase, IChallenge } from '@domain/challenge';
import { ChallengeBaseService } from './challenge.base.service';

@Resolver(() => IChallenge)
export class ChallengeBaseResolverFields {
  constructor(private challengeBaseService: ChallengeBaseService) {}

  @ResolveField('community2', () => Community, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  @Profiling.api
  async community2(@Parent() challenge: ChallengeBase) {
    return await this.challengeBaseService.getCommunity2(challenge.id);
  }
}
