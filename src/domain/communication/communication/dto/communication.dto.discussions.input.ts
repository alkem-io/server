import { Field, Float, InputType } from '@nestjs/graphql';
import { DiscussionsOrderBy } from '@common/enums/discussions.orderBy';

@InputType()
export class DiscussionsInput {
  @Field(() => Float, {
    nullable: true,
    description:
      'The number of Discussion entries to return; if omitted return all Discussions.',
  })
  limit?: number;

  @Field(() => DiscussionsOrderBy, {
    description: 'The sort order of the Discussions to return.',
    nullable: true,
  })
  orderBy?: DiscussionsOrderBy;
}
