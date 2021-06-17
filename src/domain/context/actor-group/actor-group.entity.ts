import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Actor } from '@domain/context/actor';
import { AuthorizableEntity } from '@domain/common/authorizable-entity';
import { EcosystemModel } from '@domain/context/ecosystem-model';
import { IActorGroup } from '@domain/context/actor-group';

export enum RestrictedActorGroupNames {
  Collaborators = 'collaborators',
}

@Entity()
export class ActorGroup extends AuthorizableEntity implements IActorGroup {
  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(
    () => EcosystemModel,
    ecosystemModel => ecosystemModel.actorGroups
  )
  ecosystemModel?: EcosystemModel;

  @OneToMany(
    () => Actor,
    actor => actor.actorGroup,
    { eager: true, cascade: true }
  )
  actors?: Actor[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}
