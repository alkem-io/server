import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';
import { UpdateCanvasInput } from './canvas.dto.update';

@InputType()
export class UpdateCanvasDirectInput extends UpdateCanvasInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
