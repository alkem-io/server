import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { Markdown } from '../scalars/scalar.markdown';

@ObjectType('Form')
export abstract class IForm extends IBaseAlkemio {
  @Field(() => Markdown, {
    nullable: true,
    description: 'A description of the purpose of this Form.',
  })
  description!: string;

  questions!: string;
}
