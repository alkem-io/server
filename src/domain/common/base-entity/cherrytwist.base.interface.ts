import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('ICherrytwistBase')
export abstract class ICherrytwistBase {
  @Field(() => ID, {
    nullable: false,
    description: 'The ID of the entity',
  })
  id!: number;
}
