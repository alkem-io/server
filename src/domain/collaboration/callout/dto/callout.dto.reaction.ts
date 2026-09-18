import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IUser } from '@domain/community/user/user.interface';
import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Cheap always-visible summary of the reactions on a Callout.
 * Resolved by a batched dataloader so fetching this for N callouts on a feed
 * never issues more than one aggregation query per request.
 *
 * Anti-gamification guarantee: no per-emoji count exists anywhere in this
 * type or in any related type. The only numeric aggregate is `total` (distinct
 * people), and `emojis` is a bare slug list, never a tally.
 */
@ObjectType('CalloutReactionsSummary')
export class ICalloutReactionsSummary {
  @Field(() => Int, {
    nullable: false,
    description:
      'Number of distinct people currently holding a reaction on this Callout.',
  })
  total!: number;

  @Field(() => [String], {
    nullable: false,
    description:
      'Distinct emoji slugs currently in use, in allow-list order. Never carries counts.',
  })
  emojis!: string[];

  @Field(() => String, {
    nullable: true,
    description:
      "The requesting user's current reaction slug; null when none or unauthenticated.",
  })
  myReactionEmoji?: string | null;

  @Field(() => [String], {
    nullable: false,
    description: 'The emoji slugs a user may react with on this Callout.',
  })
  allowedEmojis!: string[];
}

/**
 * One reactor entry in the who-reacted tier-2 list.
 * Bounded: at most 100 entries, most recently changed first.
 * The `user` field is nullable only to handle the deletion race window —
 * clients skip null entries.
 */
@ObjectType('CalloutReaction')
export class ICalloutReaction {
  @Field(() => UUID, { nullable: false, description: 'The unique identifier.' })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Allow-list slug (e.g. "heart").',
  })
  emoji!: string;

  @Field(() => Date, {
    nullable: false,
    description:
      "When this person's reaction was made or last changed (a swap updates this).",
  })
  updatedDate!: Date;

  @Field(() => IUser, {
    nullable: true,
    description:
      'The reactor. Null only in the deletion race window; clients skip null users.',
  })
  user?: IUser | null;
}
