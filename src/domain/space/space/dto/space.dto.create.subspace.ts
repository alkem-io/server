import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateSpaceInput } from '@domain/space';

@InputType()
export class CreateSubspaceInput extends CreateSpaceInput {
  @Field(() => UUID, { nullable: false })
  spaceID!: string;
}
