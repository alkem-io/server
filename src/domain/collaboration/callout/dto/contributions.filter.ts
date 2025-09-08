import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ContributionsFilterInput {
  @Field(() => [String], {
    nullable: true,
    description:
      'The IDs of the Contributions to return. If omitted return all.',
  })
  IDs!: string[];

  @Field(() => [CalloutContributionType], {
    nullable: true,
    description: 'The contributions types to return. If omitted return all.',
  })
  types!: CalloutContributionType[];
}
