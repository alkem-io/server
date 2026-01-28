import { SMALL_TEXT_LENGTH } from '@common/constants';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { Field, ObjectType } from '@nestjs/graphql';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

@ObjectType('CalloutContributionDefaults')
export abstract class ICalloutContributionDefaults extends IBaseAlkemio {
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
    description: 'The default description to use for new contributions.',
  })
  postDescription?: string;

  @Field(() => WhiteboardContent, {
    nullable: true,
    description: 'The default whiteboard content for whiteboard responses.',
  })
  whiteboardContent?: string;
}
