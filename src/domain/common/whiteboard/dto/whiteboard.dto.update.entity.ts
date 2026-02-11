import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { UpdateWhiteboardInput } from './whiteboard.dto.update';

@InputType()
export class UpdateWhiteboardEntityInput extends UpdateWhiteboardInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
