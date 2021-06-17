import { IAuthorizable } from '@domain/common/authorizable-entity';
import { IActor } from '@domain/context/actor';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ActorGroup')
export abstract class IActorGroup extends IAuthorizable {
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
