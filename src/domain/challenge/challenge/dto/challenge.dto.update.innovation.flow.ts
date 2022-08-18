import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class UpdateChallengeInnovationFlowInput {
  @Field(() => UUID, {
    description: 'ID of the Challenge',
  })
  challengeID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Innovation Flow template to use for the Challenge.',
  })
  innovationFlowTemplateID!: string;
}
