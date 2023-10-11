import { InputType, Field } from '@nestjs/graphql';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';

@InputType()
export class CalloutContributionFilterArgs {
  @Field(() => [UUID_NAMEID], {
    description: 'Include Contributions with Post ids/nameIds.',
    nullable: true,
  })
  postIDs?: string[];

  @Field(() => [UUID_NAMEID], {
    description: 'Include Contributions with Whiteboard ids/nameIds.',
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
