import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IUser } from '@domain/community/user/user.interface';
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('PollOption')
export abstract class IPollOption {
  @Field(() => UUID, { nullable: false })
  id!: string;

  @Field(() => Date, { nullable: false })
  createdDate!: Date;

  @Field(() => Date, { nullable: false })
  updatedDate!: Date;

  @Field(() => String, { nullable: false })
  text!: string;

  @Field(() => Int, {
    nullable: false,
    description:
      'Position of this option in the creation order (used for tie-breaking in results).',
  })
  sortOrder!: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Number of votes this option has received. Null when results are hidden or resultsDetail = PERCENTAGE.',
  })
  voteCount?: number;

  @Field(() => Float, {
    nullable: true,
    description:
      'Percentage of total votes this option has received (0–100). Null when results are hidden or resultsDetail = COUNT. Null when totalVotes = 0.',
  })
  votePercentage?: number;

  @Field(() => [IUser], {
    nullable: true,
    description:
      'List of space members who voted for this option. Null when results are hidden or resultsDetail is not FULL.',
  })
  voters?: IUser[];
}
