import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@ObjectType('IBaseAlkemio')
export abstract class IBaseAlkemio {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the entity',
  })
  id!: string;

  constructor() {
    this.id = '';
  }
}
