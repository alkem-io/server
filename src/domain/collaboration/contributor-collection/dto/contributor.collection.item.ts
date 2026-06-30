import { ActorType } from '@common/enums/actor.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';
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
}
