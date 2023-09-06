import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';
import { UpdateWhiteboardRtInput } from './whiteboard.rt.dto.update';

@InputType()
export class UpdateWhiteboardRtDirectInput extends UpdateWhiteboardRtInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
