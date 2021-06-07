import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { EcosystemModel, IActorGroup, Actor } from '@domain/context';
import { AuthorizableEntity } from '@domain/common/authorizable-entity';

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
