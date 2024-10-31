import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateCollaborationFromTemplateInput {
  @Field(() => UUID, {
    description: 'ID of the Collaboration to be updated',
  })
  collaborationID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The Collaboration Template that will be used for updates to the Collaboration',
  })
  collaborationTemplateID!: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Add in the Callouts',
  })
  addCallouts = false;
}
