import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('IBaseCherrytwist')
export abstract class IBaseCherrytwist {
  @Field(() => ID, {
    nullable: false,
    description: 'The ID of the entity',
  })
  id!: number;

  constructor() {
    this.id = -1;
  }
}
