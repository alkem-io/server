import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';

@InputType()
export class CreateCalloutContributionDefaultsInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new Post contributions.',
  })
  postDescription?: string;

  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  whiteboardContent?: string;
}
