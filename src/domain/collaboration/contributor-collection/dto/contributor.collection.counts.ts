import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('ContributorCollectionCounts')
export abstract class IContributorCollectionCounts {
  @Field(() => Int, { nullable: false })
  users!: number;

  @Field(() => Int, { nullable: false })
  organizations!: number;

  @Field(() => Int, { nullable: false })
  virtualContributors!: number;
}
