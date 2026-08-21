import { AuthorizationActorHasPrivilege } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ReactionType } from '@common/enums/reaction.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { GraphqlGuard } from '@core/authorization';
import {
  CalloutActivityLoaderCreator,
  CalloutReactionsSummaryLoaderCreator,
  CalloutTaskColumnCountsLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { CalloutMyReactionLoaderCreator } from '@core/dataloader/creators/loader.creators/callout/callout.my.reaction.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CALLOUT_REACTION_ALLOWED_EMOJIS } from '@domain/collaboration/reaction/reaction.constants';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { IClassification } from '@domain/common/classification/classification.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IUser } from '@domain/community/user/user.interface';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { Args, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { CalloutContributionsCountOutput } from './dto/callout.contributions.count.dto';
import {
  ICalloutReaction,
  ICalloutReactionsSummary,
} from './dto/callout.dto.reaction';
import { ContributionsFilterInput } from './dto/contributions.filter';
import { TaskColumnCount } from './task-board/dto/task.column.count';

@Resolver(() => ICallout)
export class CalloutResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private calloutService: CalloutService,
    private reactionService: ReactionService,
    private myReactionHelper: CalloutMyReactionLoaderCreator
  ) {}

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributions', () => [ICalloutContribution], {
    nullable: false,
    description: 'The Contributions that have been made to this Callout.',
  })
  async contributions(
    @Parent() callout: Callout,
    @Args({
      name: 'filter',
      type: () => ContributionsFilterInput,
      description: 'Filter to apply to the Contributions returned.',
      nullable: true,
    })
    filter?: ContributionsFilterInput,
    @Args({
      name: 'limit',
      type: () => Int,
      description:
        'The number of Contributions to return; if omitted return all Contributions.',
      nullable: true,
    })
    limit?: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Contributions based on a random selection. Defaults to false.',
      nullable: true,
    })
    shuffle?: boolean
  ): Promise<ICalloutContribution[]> {
    return await this.calloutService.getContributions(
      callout,
      filter?.IDs,
      filter?.types,
      limit,
      shuffle
    );
  }
  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributionsCount', () => CalloutContributionsCountOutput, {
    nullable: false,
    description: 'The Contributions that have been made to this Callout.',
  })
  async contributionsCount(
    @Parent() callout: Callout
  ): Promise<CalloutContributionsCountOutput> {
    return await this.calloutService.getContributionsCount(callout);
  }

  @ResolveField('taskColumnCounts', () => [TaskColumnCount], {
    nullable: true,
    description:
      'Per-column task counts for a Tasks board callout, in the board-defined column order and zero-filled; null when the callout is not a Tasks board.',
  })
  async taskColumnCounts(
    @Parent() callout: Callout,
    @Loader(CalloutTaskColumnCountsLoaderCreator)
    loader: ILoader<TaskColumnCount[] | null>
  ): Promise<TaskColumnCount[] | null> {
    // Board-ness, the ordered columns, and the zero-filled counts are all
    // resolved by the batched loader — no per-callout callout re-fetch, so a
    // list of N callouts pays a fixed number of queries, not N.
    return loader.load(callout.id);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('comments', () => IRoom, {
    nullable: true,
    description: 'The comments for this Callout.',
  })
  async comments(@Parent() callout: Callout): Promise<IRoom | undefined> {
    return await this.calloutService.getComments(callout.id);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('classification', () => IClassification, {
    nullable: true,
    description: 'The comments for this Callout.',
  })
  async classification(
    @Parent() callout: Callout
  ): Promise<IClassification | undefined> {
    // TODO: must be a loader, will be used a lot
    return await this.calloutService.getClassification(callout.id);
  }

  @ResolveField('activity', () => Number, {
    nullable: false,
    description:
      'The activity for this Callout. The number of Contributions if the callout allows contributions, or the number of comments if it does not.',
  })
  async activity(
    @Parent() callout: ICallout,
    @Loader(CalloutActivityLoaderCreator)
    loader: ILoader<number>
  ): Promise<number> {
    // If activity was already computed (e.g. during sortByActivity), reuse it
    if (callout.activity !== undefined) {
      return callout.activity;
    }
    // Contribution-type callouts: use batched DataLoader (1 query for all callouts)
    if (callout.settings.contribution.allowedTypes.length > 0) {
      return loader.load(callout.id);
    }
    // Comment-type callouts: fall back to individual RPC (rare, involves Matrix)
    // can be optimized further with the adapter supporting reading multiple rooms
    return await this.calloutService.getActivityCount(callout);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributionDefaults', () => ICalloutContributionDefaults, {
    nullable: false,
    description: 'The Contribution Defaults for this Callout.',
  })
  async contributionDefaults(
    @Parent() callout: Callout
  ): Promise<ICalloutContributionDefaults> {
    return await this.calloutService.getContributionDefaults(callout.id);
  }

  @ResolveField('publishedBy', () => IUser, {
    nullable: true,
    description: 'The user that published this Callout',
  })
  async publishedBy(
    @Parent() callout: ICallout,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    if (
      !callout.publishedBy ||
      callout.settings.visibility !== CalloutVisibility.PUBLISHED
    ) {
      return null;
    }
    return loader.load(callout.publishedBy);
  }

  @ResolveField('publishedDate', () => Date, {
    nullable: true,
    description: 'The Date of the publishing of this Callout.',
  })
  async publishedDate(@Parent() callout: ICallout): Promise<Date | null> {
    if (
      !callout.publishedDate ||
      callout.settings.visibility !== CalloutVisibility.PUBLISHED
    ) {
      return null;
    }
    return callout.publishedDate;
  }

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Callout',
  })
  async createdBy(
    @Parent() callout: ICallout,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    if (!callout.createdBy) {
      return null;
    }
    return loader.load(callout.createdBy);
  }

  @ResolveField('reactionsSummary', () => ICalloutReactionsSummary, {
    nullable: false,
    description:
      'Cheap always-shown summary (tier-1). Dataloader-batched; safe to select on feeds.',
  })
  async reactionsSummary(
    @Parent() callout: ICallout,
    @CurrentActor() actorContext: ActorContext,
    @Loader(CalloutReactionsSummaryLoaderCreator)
    summaryLoader: ILoader<
      | import('@core/dataloader/creators/loader.creators/callout/callout.reactions.summary.loader.creator').CalloutReactionsSummaryResult
      | null
    >
  ): Promise<ICalloutReactionsSummary> {
    const summary = await summaryLoader.load(callout.id);

    const myReactionEmoji = await this.myReactionHelper.loadMyReaction(
      callout.id,
      actorContext.actorID || null
    );

    return {
      total: summary?.total ?? 0,
      emojis: summary?.emojis ?? [],
      myReactionEmoji: myReactionEmoji ?? null,
      allowedEmojis: [...CALLOUT_REACTION_ALLOWED_EMOJIS],
    };
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('reactions', () => [ICalloutReaction], {
    nullable: false,
    description:
      'Who reacted (tier-2). Bounded: 100 most recent by last change, descending. Fetch only on demand.',
  })
  async reactions(
    @Parent() callout: ICallout,
    @Loader(UserLoaderCreator) userLoader: ILoader<IUser | null>
  ): Promise<ICalloutReaction[]> {
    const rawReactions = await this.reactionService.getReactionsForEntity(
      ReactionType.POST,
      callout.id,
      100
    );

    // Load all users in parallel so DataLoader can coalesce them into a
    // single batched query rather than one query per reaction.
    const users = await Promise.all(
      rawReactions.map(r => userLoader.load(r.createdBy))
    );

    const results: ICalloutReaction[] = [];
    for (let i = 0; i < rawReactions.length; i++) {
      const user = users[i];
      // Skip entries whose creator cannot be resolved (deletion race window).
      if (!user) continue;
      const r = rawReactions[i];
      results.push({
        id: r.id,
        emoji: r.emoji,
        updatedDate: r.updatedDate,
        user,
      });
    }
    return results;
  }
}
