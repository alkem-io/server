import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';

@ObjectType('CalloutResponseDefaults')
export abstract class ICalloutResponseDefaults extends IBaseAlkemio {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new contributions.',
  })
  postDescription?: string;

  @Field(() => JSON, {
    nullable: true,
    description: 'The default whiteboard content for whiteboard responses.',
  })
  whiteboardContent?: string;
}
