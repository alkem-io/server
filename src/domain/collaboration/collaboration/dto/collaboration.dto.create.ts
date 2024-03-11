import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CreateCollaborationInput {
  @Field(() => UUID, {
    nullable: true,
    description: 'The Innovation Flow template to use for the Collaboration.',
  })
  innovationFlowTemplateID?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The ID of the Collaboration to use for setting up the collaboration of the Collaboration.',
  })
  collaborationTemplateID?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Add default callouts to the Collaboration; defaults to true.',
  })
  addDefaultCallouts? = true;
}
