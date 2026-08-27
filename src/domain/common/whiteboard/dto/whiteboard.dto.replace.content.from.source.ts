import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ReplaceWhiteboardContentFromSourceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Whiteboard whose content is replaced.',
  })
  targetWhiteboardID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The Whiteboard whose content and media are copied into the target.',
  })
  sourceWhiteboardID!: string;
}
