import { ArgsType, Field, Float } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { TagsetArgs } from '@domain/common/tagset/dto/tagset.args';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

@ArgsType()
export class CalloutsSetArgsCallouts {
  @Field(() => [UUID], {
    description: 'The IDs of the callouts to return',
    nullable: true,
  })
  IDs?: string[];

  @Field(() => [CalloutContributionType], {
    description:
      'The type of Contributions the callouts allow; if omitted return all Callouts will be returned.',
    nullable: true,
  })
  withContributionTypes?: CalloutContributionType[];

  @Field(() => Float, {
    description:
      'The number of Callouts to return; if omitted return all Callouts.',
    nullable: true,
  })
  limit?: number;

  @Field(() => Boolean, {
    description:
      'If true and limit is specified then return the Callouts based on a random selection. Defaults to false.',
    nullable: true,
  })
  shuffle?: boolean;

  @Field(() => Boolean, {
    description:
      'If true then return the Callouts sorted by most activity. Defaults to false.',
    nullable: true,
  })
  sortByActivity?: boolean;

  @Field(() => [TagsetArgs], {
    description: 'Return only Callouts matching the specified filter.',
    nullable: true,
  })
  classificationTagsets?: TagsetArgs[];
}
