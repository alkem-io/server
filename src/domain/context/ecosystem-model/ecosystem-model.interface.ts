import { IAuthorizable } from '@domain/common/authorizable-entity';
import { IActorGroup } from '@domain/context';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('EcosystemModel')
export abstract class IEcosystemModel extends IAuthorizable {
  @Field(() => String, {
    nullable: true,
    description: 'Overview of this ecosystem model.',
  })
  description?: string;

  @Field(() => [IActorGroup], {
    nullable: true,
    description: 'A list of ActorGroups',
  })
  actorGroups?: IActorGroup[];

  restrictedActorGroupNames!: string[];
}
