import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateSpaceInput } from './space.dto.create';

@InputType()
export class CreateSubspaceInput extends CreateSpaceInput {
  @Field(() => UUID, { nullable: false })
  spaceID!: string;
}
