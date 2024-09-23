import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field, OmitType } from '@nestjs/graphql';
import { UpdateWhiteboardInput } from './whiteboard.dto.update';

@InputType()
// omit the content from this input type
export class UpdateWhiteboardEntityInput extends OmitType(
  UpdateWhiteboardInput,
  ['content']
) {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
