import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutResponseDefaults')
export abstract class ICalloutResponseDefaults extends IBaseAlkemio {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new contributions.',
  })
  description?: string;
}
