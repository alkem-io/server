import { IBaseCherrytwist } from '@domain/common/base-entity';
import { IActor } from '@domain/context/actor/actor.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ActorGroup')
export abstract class IActorGroup extends IBaseCherrytwist {
  @Field(() => String)
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'A description of this group of actors',
  })
  description?: string;

  @Field(() => [IActor], {
    nullable: true,
    description: 'The set of actors in this actor group',
  })
  actors?: IActor[];
}
