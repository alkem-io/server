import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';
import { UpdateWhiteboardInput } from './whiteboard.dto.update';

@InputType()
export class UpdateWhiteboardDirectInput extends UpdateWhiteboardInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
