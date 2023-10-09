import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';

@ObjectType('CalloutContributionDefaults')
export abstract class ICalloutContributionDefaults extends IBaseAlkemio {
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
