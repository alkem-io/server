import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ITemplateBase')
export abstract class ITemplateBase extends IBaseAlkemio {
  @Field(() => String, {
    nullable: true,
    description: 'The title for this Template.',
  })
  title!: string;
}
