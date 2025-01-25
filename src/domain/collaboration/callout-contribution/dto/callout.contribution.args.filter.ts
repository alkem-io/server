import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CalloutContributionFilterArgs {
  @Field(() => [UUID], {
    description: 'Include Contributions with Post ids.',
    nullable: true,
  })
  postIDs?: string[];

  @Field(() => [UUID], {
    description: 'Include Contributions with Whiteboard ids.',
    nullable: true,
  })
  whiteboardIDs?: string[];

  @Field(() => [UUID], {
    description:
      'Include Contributions with Link ids of contributions to include.',
    nullable: true,
  })
  linkIDs?: string[];
}
