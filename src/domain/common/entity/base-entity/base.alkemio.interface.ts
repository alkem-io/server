import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('IBaseAlkemio')
export abstract class IBaseAlkemio {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the entity',
  })
  id!: string;

  @Field(() => Date, {
    description: 'The date at which the entity was created.',
    nullable: false,
  })
  createdDate!: Date;

  @Field(() => Date, {
    description: 'The date at which the entity was last updated.',
    nullable: false,
  })
  updatedDate!: Date;

  constructor() {
    this.id = '';
  }
}
