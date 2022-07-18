import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteCanvasOnCalloutInput {
  @Field(() => UUID, { nullable: false })
  calloutID!: string;

  @Field(() => UUID, { nullable: false })
  canvasID!: string;
}
