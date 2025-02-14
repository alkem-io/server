import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class RemoveCommunityGuidelinesContentInput {
  @Field(() => UUID, {
    description: 'ID of the CommunityGuidelines that will be emptied',
  })
  communityGuidelinesID!: string;
}
