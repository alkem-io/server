import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { IDiscussion } from './discussion.interface';
import { DiscussionService } from './discussion.service';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';

@InstrumentResolver()
@Resolver()
export class DiscussionResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private discussionService: DiscussionService
  ) {}

  @Mutation(() => IDiscussion, {
    description: 'Deletes the specified Discussion.',
  })
  async deleteDiscussion(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteDiscussionInput
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      deleteData.ID
    );
    // 027-platform-role-redesign (T049, A15, FR-007(e); corr-server-7/
    // spec-server-7 fix): gated SOLELY on PLATFORM_FORUM_MANAGE — NOT a
    // dual path with bare DELETE. `PLATFORM_FORUM_MANAGE`'s own grant set
    // (platform.service.authorization.ts) is already
    // {platform-support, global-admin, global-support} ∪ legacy, so every
    // legacy reacher this feature must preserve (T073's GLOBAL_SUPPORT
    // platform-subtree cascade included) already holds it directly — a
    // second bare-DELETE branch adds NOTHING for a legitimate legacy
    // holder, but DOES let `platform-content-full-access` in through the
    // root cascade's CRUD (T036a), which spec.md explicitly excludes from
    // the forum family (A15 is NOT covered by the A6/A7 exception).
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      discussion.authorization,
      AuthorizationPrivilege.PLATFORM_FORUM_MANAGE,
      `delete discussion: ${discussion.id}`
    );
    return await this.discussionService.removeDiscussion(deleteData);
  }

  @Mutation(() => IDiscussion, {
    description: 'Updates the specified Discussion.',
  })
  async updateDiscussion(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateDiscussionInput
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      updateData.ID,
      {
        relations: { profile: true, comments: true },
      }
    );
    // 027-platform-role-redesign (T049, A15, FR-007(e); corr-server-7/
    // spec-server-7 fix): gated SOLELY on PLATFORM_FORUM_MANAGE — see the
    // identical comment on deleteDiscussion above.
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      discussion.authorization,
      AuthorizationPrivilege.PLATFORM_FORUM_MANAGE,
      `Update discussion: ${discussion.id}`
    );
    return await this.discussionService.updateDiscussion(
      discussion,
      updateData
    );
  }
}
