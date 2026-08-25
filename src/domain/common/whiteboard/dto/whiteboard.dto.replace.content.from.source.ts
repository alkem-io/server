import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ReplaceWhiteboardContentFromSourceInput {
  @Field(() => UUID, { nullable: false })
  targetWhiteboardID!: string;

  @Field(() => UUID, { nullable: false })
  sourceWhiteboardID!: string;
}
