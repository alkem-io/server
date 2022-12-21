import { UUID_NAMEID } from '@domain/common/scalars';
import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class CollaborationArgsCallouts {
  @Field(() => [UUID_NAMEID], {
    name: 'IDs',
    description: 'The IDs of the callouts to return',
    nullable: true,
  })
  ids?: string[];

  @Field(() => Float, {
    name: 'limit',
    description:
      'The number of Callouts to return; if omitted return all Callouts.',
    nullable: true,
  })
  limit?: number;

  @Field(() => Boolean, {
    name: 'shuffle',
    description:
      'If true and limit is specified then return the Callouts based on a random selection. Defaults to false.',
    nullable: true,
  })
  shuffle?: boolean;

  @Field(() => Boolean, {
    name: 'sortByActivity',
    description:
      'If true then return the Callouts sorted by most activity. Defaults to false.',
    nullable: true,
  })
  sortByActivity?: boolean;
}
