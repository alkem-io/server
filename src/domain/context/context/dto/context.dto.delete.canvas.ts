import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteCanvasOnContextInput {
  @Field(() => UUID, { nullable: false })
  contextID!: string;

  @Field(() => UUID, { nullable: false })
  canvasID!: string;
}
