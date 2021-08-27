import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
@ObjectType('Canvas')
export abstract class ICanvas extends IBaseAlkemio {
  @Field(() => String, {
    description: 'The name of the Canvas.',
  })
  name!: string;

  @Field(() => JSON, {
    description: 'The JSON representation of the Canvas.',
  })
  value?: string;
}
