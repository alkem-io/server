import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';

@InputType()
export class UpdateCalloutResponseDefaultsInput extends UpdateBaseAlkemioInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new Post contributions.',
  })
  postDescription?: string;

  @Field(() => WhiteboardContent, {
    nullable: true,
    description:
      'The default description to use for new Whiteboard contributions.',
  })
  @IsOptional()
  whiteboardContent?: string;
}
