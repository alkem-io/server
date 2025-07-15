import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCollaborationOnSpaceInput extends CreateCollaborationInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Add tutorial callouts to the Collaboration; defaults to false.',
  })
  addTutorialCallouts? = false;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Add callouts from the template to the Collaboration; defaults to true.',
  })
  addCallouts? = true;
}
