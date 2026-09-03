import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  assertForumCategoryAllowed,
  isAdminOnlyForumCategory,
} from '@platform/forum/forum.category.allowed';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { IDiscussion } from './discussion.interface';
import { DiscussionService } from './discussion.service';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';

@InstrumentResolver()
@Resolver()
export class DiscussionResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private discussionService: DiscussionService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private platformOperationsAuditService: PlatformOperationsAuditService
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
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      discussion.authorization,
      AuthorizationPrivilege.DELETE,
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
        relations: { profile: true, comments: true, forum: true },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      discussion.authorization,
      AuthorizationPrivilege.UPDATE,
      `Update discussion: ${discussion.id}`
    );

    const previousCategory = discussion.category;

    // Data-integrity, not a security fix: every actor who can reach this
    // UPDATE gate is already a strict subset of the PLATFORM_ADMIN holders
    // the create path requires for these same
    // categories — this makes "the active list defines what's allowed"
    // an invariant the server enforces on category-change too, not only
    // on create.
    //
    // Scoped to an actual *change*, not to the field merely being present:
    // the edit dialog always echoes the post's current category back on
    // save, and the picker deliberately offers the active list plus the
    // post's own current category so a post stranded in a retired category
    // can be moved out of it. Guarding on presence would refuse a pure
    // title edit of exactly such a post. Same condition as the audit row
    // below, for the same reason.
    const newCategory =
      updateData.category && updateData.category !== previousCategory
        ? updateData.category
        : undefined;

    if (newCategory) {
      if (!discussion.forum) {
        throw new EntityNotFoundException(
          'Unable to load Forum for Discussion',
          LogContext.PLATFORM_FORUM,
          { discussionID: discussion.id }
        );
      }
      assertForumCategoryAllowed(
        discussion.forum.discussionCategories,
        newCategory
      );
      if (isAdminOnlyForumCategory(newCategory)) {
        const platformAuthorization =
          await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
        await this.authorizationService.grantAccessOrFail(
          actorContext,
          platformAuthorization,
          AuthorizationPrivilege.PLATFORM_ADMIN,
          `User not authorized to move discussion into ${newCategory} category.`
        );
      }
    }

    const updatedDiscussion = await this.discussionService.updateDiscussion(
      discussion,
      updateData
    );

    // Audit fail-open: an audit-write failure must never block a curator's
    // edit — `PlatformOperationsAuditService` already swallows its own
    // errors, and the explicit `.catch()` here is defence in depth so this
    // resolver's own contract does not silently depend on that detail.
    if (newCategory) {
      await this.platformOperationsAuditService
        .recordOperation({
          actorID: actorContext.actorID,
          action: 'updateDiscussionCategory',
          outcome: 'success',
          target: {
            discussionID: discussion.id,
            nameID: discussion.nameID,
            from: previousCategory,
            to: newCategory,
          },
        })
        .catch(() => undefined);
    }

    return updatedDiscussion;
  }
}
