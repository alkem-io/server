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
    // 027-platform-role-redesign (T049, A15, FR-007(e)): dual-path —
    // ordinary DELETE (today's reach, including the GLOBAL_SUPPORT
    // platform-subtree cascade this feature does not touch until Slice B,
    // T073) alongside platform-support's own PLATFORM_FORUM_MANAGE
    // privilege, so Support does not lose forum access when that cascade is
    // deleted.
    const canDeleteAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      discussion.authorization,
      AuthorizationPrivilege.DELETE
    );
    const canDeleteAsForumManager = this.authorizationService.isAccessGranted(
      actorContext,
      discussion.authorization,
      AuthorizationPrivilege.PLATFORM_FORUM_MANAGE
    );
    if (!canDeleteAsOwner && !canDeleteAsForumManager) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        discussion.authorization,
        AuthorizationPrivilege.DELETE,
        `delete discussion: ${discussion.id}`
      );
    }
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
    // 027-platform-role-redesign (T049, A15, FR-007(e)): dual-path — see
    // the identical comment on deleteDiscussion above.
    const canUpdateAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      discussion.authorization,
      AuthorizationPrivilege.UPDATE
    );
    const canUpdateAsForumManager = this.authorizationService.isAccessGranted(
      actorContext,
      discussion.authorization,
      AuthorizationPrivilege.PLATFORM_FORUM_MANAGE
    );
    if (!canUpdateAsOwner && !canUpdateAsForumManager) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        discussion.authorization,
        AuthorizationPrivilege.UPDATE,
        `Update discussion: ${discussion.id}`
      );
    }
    return await this.discussionService.updateDiscussion(
      discussion,
      updateData
    );
  }
}
