import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Canvas')
export abstract class ICanvas extends IBaseAlkemio {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  value?: string;
}
