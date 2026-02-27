import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ContributionsFilterInput {
  @Field(() => [UUID], {
    nullable: true,
    description:
      'The IDs of the Contributions to return. If omitted return all.',
  })
  IDs?: string[];

  @Field(() => [CalloutContributionType], {
    nullable: true,
    description: 'The contributions types to return. If omitted return all.',
  })
  types?: CalloutContributionType[];
}
