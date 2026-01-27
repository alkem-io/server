import { SMALL_TEXT_LENGTH } from '@common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdateCalloutContributionDefaultsInput {
  @Field({
    nullable: true,
    description: 'The default title to use for new contributions.',
  })
  @IsOptional()
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  defaultDisplayName?: string;

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
