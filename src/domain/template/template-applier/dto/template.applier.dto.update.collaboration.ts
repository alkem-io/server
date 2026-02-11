import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCollaborationFromSpaceTemplateInput {
  @Field(() => UUID, {
    description: 'ID of the Collaboration to be updated',
  })
  collaborationID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The Space Template whose Collaboration that will be used for updates to the target Collaboration',
  })
  spaceTemplateID!: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Add the Callouts from the Collaboration Template',
  })
  addCallouts = false;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Delete existing Callouts before applying template. When combined with addCallouts=true, enables Replace All behavior.',
  })
  deleteExistingCallouts = false;
}
