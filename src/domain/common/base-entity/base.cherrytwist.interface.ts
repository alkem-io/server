import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '../scalars/scalar.uuid';

@ObjectType('IBaseCherrytwist')
export abstract class IBaseCherrytwist {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the entity',
  })
  id!: string;

  authorizationRules!: string;

  constructor() {
    this.id = '';
    this.authorizationRules = '';
  }
}
