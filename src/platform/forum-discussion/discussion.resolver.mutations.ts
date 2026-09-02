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

    // Data-integrity, not a security fix (spec 060 A-03): every actor who
    // can reach this UPDATE gate is already a strict subset of the
    // PLATFORM_ADMIN holders the create path requires for these same
    // categories — this makes "the active list defines what's allowed"
    // an invariant the server enforces on category-change too, not only
    // on create.
    if (updateData.category) {
      if (!discussion.forum) {
        throw new EntityNotFoundException(
          `Unable to load Forum for Discussion with ID: ${discussion.id}`,
          LogContext.PLATFORM_FORUM
        );
      }
      assertForumCategoryAllowed(
        discussion.forum.discussionCategories,
        updateData.category
      );
      if (isAdminOnlyForumCategory(updateData.category)) {
        const platformAuthorization =
          await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
        await this.authorizationService.grantAccessOrFail(
          actorContext,
          platformAuthorization,
          AuthorizationPrivilege.PLATFORM_ADMIN,
          `User not authorized to move discussion into ${updateData.category} category.`
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
    if (updateData.category && updateData.category !== previousCategory) {
      await this.platformOperationsAuditService
        .recordOperation({
          actorID: actorContext.actorID,
          action: 'updateDiscussionCategory',
          outcome: 'success',
          target: {
            discussionID: discussion.id,
            nameID: discussion.nameID,
            from: previousCategory,
            to: updateData.category,
          },
        })
        .catch(() => undefined);
    }

    return updatedDiscussion;
  }
}
