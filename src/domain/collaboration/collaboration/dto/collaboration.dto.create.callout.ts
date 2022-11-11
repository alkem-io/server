import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateCalloutOnCollaborationInput extends CreateCalloutInput {
  @Field(() => UUID, { nullable: false })
  collaborationID!: string;
}
