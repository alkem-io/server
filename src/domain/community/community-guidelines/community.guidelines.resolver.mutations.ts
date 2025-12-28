import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ICommunityGuidelines } from './community.guidelines.interface';
import { CommunityGuidelinesService } from './community.guidelines.service';
import { UpdateCommunityGuidelinesEntityInput } from './dto/community.guidelines.dto.update.entity';
import { RemoveCommunityGuidelinesContentInput as RemoveCommunityGuidelinesContentInput } from './dto/community.guidelines.dto.remove.content';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class CommunityGuidelinesResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private communityGuidelinesService: CommunityGuidelinesService
  ) {}

  @Mutation(() => ICommunityGuidelines, {
    description: 'Updates the CommunityGuidelines.',
  })
  @Profiling.api
  async updateCommunityGuidelines(
    @CurrentUser() actorContext: ActorContext,
    @Args('communityGuidelinesData')
    communityGuidelinesData: UpdateCommunityGuidelinesEntityInput
  ): Promise<ICommunityGuidelines> {
    const communityGuidelines =
      await this.communityGuidelinesService.getCommunityGuidelinesOrFail(
        communityGuidelinesData.communityGuidelinesID
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      communityGuidelines.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateCommunityGuidelines: ${communityGuidelines.id}`
    );

    return await this.communityGuidelinesService.update(
      communityGuidelines,
      communityGuidelinesData
    );
  }

  @Mutation(() => ICommunityGuidelines, {
    description: 'Empties the CommunityGuidelines.', // Update mutation doesn't allow empty values. And we cannot really delete the entity, but this will leave it empty.
  })
  @Profiling.api
  async removeCommunityGuidelinesContent(
    @CurrentUser() actorContext: ActorContext,
    @Args('communityGuidelinesData')
    communityGuidelinesData: RemoveCommunityGuidelinesContentInput
  ): Promise<ICommunityGuidelines> {
    const communityGuidelines =
      await this.communityGuidelinesService.getCommunityGuidelinesOrFail(
        communityGuidelinesData.communityGuidelinesID
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      communityGuidelines.authorization,
      AuthorizationPrivilege.UPDATE,
      `removeCommunityGuidelinesContent: ${communityGuidelines.id}`
    );

    return await this.communityGuidelinesService.eraseContent(
      communityGuidelines
    );
  }
}
