import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Actor } from '@domain/context/actor/actor.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { EcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.entity';
import { IActorGroup } from '@domain/context/actor-group/actor-group.interface';

export enum RestrictedActorGroupNames {
  COLLABORATORS = 'collaborators',
}

@Entity()
export class ActorGroup extends AuthorizableEntity implements IActorGroup {
  @Column()
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(
    () => EcosystemModel,
    ecosystemModel => ecosystemModel.actorGroups,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  ecosystemModel?: EcosystemModel;

  @OneToMany(() => Actor, actor => actor.actorGroup, {
    eager: true,
    cascade: true,
  })
  actors?: Actor[];

  constructor() {
    super();
  }
}
