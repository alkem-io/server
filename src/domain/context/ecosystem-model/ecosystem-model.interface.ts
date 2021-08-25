import { ICanvas } from '@domain/common/canvas';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IActorGroup } from '@domain/context/actor-group/actor-group.interface';
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

  canvas?: ICanvas;

  restrictedActorGroupNames!: string[];
}
