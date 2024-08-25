import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateWhiteboardContentInput extends UpdateBaseAlkemioInput {
  @Field(() => WhiteboardContent)
  content!: string;
}
