import { CreateCalloutInput } from '@domain/collaboration/callout';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateCalloutOnCollaborationInput extends CreateCalloutInput {
  @Field(() => UUID, { nullable: false })
  collaborationID!: string;
}
