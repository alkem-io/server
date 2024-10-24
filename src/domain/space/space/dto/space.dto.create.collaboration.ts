import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCollaborationOnSpaceInput extends CreateCollaborationInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Add tutorial callouts to the Collaboration; defaults to false.',
  })
  addTutorialCallouts? = false;

  @Field(() => UUID, {
    nullable: true,
    description: 'The Template to use for instantiating the Collaboration.',
  })
  collaborationTemplateID?: string;
}
