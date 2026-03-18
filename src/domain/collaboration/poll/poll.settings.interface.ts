import { PollResultsDetail } from '@common/enums/poll.results.detail';
import { PollResultsVisibility } from '@common/enums/poll.results.visibility';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('PollSettings')
export abstract class IPollSettings {
  @Field(() => Int, {
    nullable: false,
    description:
      'Minimum number of options a voter must select (≥ 1). Immutable after poll creation.',
  })
  minResponses!: number;

  @Field(() => Int, {
    nullable: false,
    description:
      'Maximum number of options a voter may select (0 = unlimited). Immutable after poll creation.',
  })
  maxResponses!: number;

  @Field(() => PollResultsVisibility, {
    nullable: false,
    description:
      'Controls when results become visible to voters. Immutable after poll creation.',
  })
  resultsVisibility!: PollResultsVisibility;

  @Field(() => PollResultsDetail, {
    nullable: false,
    description:
      'Controls how much detail is shown in results. Immutable after poll creation.',
  })
  resultsDetail!: PollResultsDetail;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether users with CONTRIBUTE privilege can add new options to the poll. Immutable after poll creation. Default: false.',
  })
  allowContributorsAddOptions!: boolean;
}
