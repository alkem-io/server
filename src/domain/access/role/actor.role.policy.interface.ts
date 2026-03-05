import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ActorRolePolicy')
export abstract class IActorRolePolicy {
  @Field(() => Number, {
    description: 'Minimum number of Actors in this role',
  })
  minimum!: number;

  @Field(() => Number, {
    description: 'Maximum number of Actors in this role',
  })
  maximum!: number;
}
