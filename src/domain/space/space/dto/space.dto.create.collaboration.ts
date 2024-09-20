import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCollaborationOnSpaceInput extends CreateCollaborationInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Add default callouts to the Collaboration; defaults to true.',
  })
  addDefaultCallouts? = true;
}
