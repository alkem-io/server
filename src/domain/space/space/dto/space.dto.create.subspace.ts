import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateSpaceInput } from './space.dto.create';

@InputType()
export class CreateSubspaceOnSpaceInput extends CreateSpaceInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  spaceID!: string;
}
