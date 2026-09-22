import { ActorType } from '@common/enums/actor.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IContributorLocation } from './contributor.location';

@ObjectType('ContributorCollectionItem')
export abstract class IContributorCollectionItem {
  @Field(() => UUID, { nullable: false })
  id!: string;

  @Field(() => ActorType, { nullable: false })
  type!: ActorType;

  @Field(() => String, { nullable: false })
  displayName!: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The role label for this contributor (lead/admin/member).',
  })
  roleLabel?: string;

  @Field(() => String, { nullable: true })
  url?: string;

  @Field(() => IContributorLocation, {
    nullable: true,
    description:
      'Location of the contributor; null for Virtual Contributors or when not readable.',
  })
  location?: IContributorLocation;

  @Field(() => String, {
    nullable: true,
    description:
      'All contributor types. The profile tagline, trimmed; null when empty.',
  })
  tagline?: string;

  @Field(() => [String], {
    nullable: true,
    description:
      'All contributor types. The full tag list of the first non-empty profile tagset — Users: skills, then keywords; Organizations and Virtual Contributors: keywords, then capabilities. Never merged, never the default tagset; blank tags removed. Empty list when none. Clients decide how many to show.',
  })
  tags?: string[];

  @Field(() => Date, {
    nullable: true,
    description:
      'Users only. The calendar month in which the user\'s current membership of the space that owns this callout began ("member since"): the creation date of the member credential, truncated to the first day of the month, 00:00 UTC. Leaving and re-joining restarts it. Null for Organizations and Virtual Contributors, and for a user listed without the member role.',
  })
  joinedDate?: Date;

  @Field(() => String, {
    nullable: true,
    description:
      "Organizations only. The organization's website, trimmed; null when empty or when it is not an absolute http/https URL. Null for Users and Virtual Contributors.",
  })
  website?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      "Organizations only. The count of platform-wide associates of the organization (distinct users holding its associate role) — the same number as the organization's 'associates' metric; NOT the number of members of this space. Null for Users and Virtual Contributors.",
  })
  associatesCount?: number;
}
