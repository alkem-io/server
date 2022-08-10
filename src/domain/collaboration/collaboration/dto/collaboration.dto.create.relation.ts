import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { CreateRelationInput } from '@domain/collaboration/relation/relation.dto.create';

@InputType()
export class CreateRelationOnCollaborationInput extends CreateRelationInput {
  @Field(() => UUID, { nullable: false })
  collaborationID!: string;
}
