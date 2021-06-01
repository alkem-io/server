import { Column, Entity, OneToMany } from 'typeorm';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { ActorGroup } from '@domain/context/actor-group';
import { AuthorizableEntity } from '@domain/common/authorizable-entity';
@Entity()
export class EcosystemModel extends AuthorizableEntity
  implements IEcosystemModel {
  @Column('varchar', { length: 255, nullable: true })
  description?: string = '';

  @OneToMany(
    () => ActorGroup,
    actorGroup => actorGroup.ecosystemModel,
    { eager: true, cascade: true }
  )
  actorGroups?: ActorGroup[];

  // The restricted actor group names at the Opportunity level
  restrictedActorGroupNames: string[];

  constructor() {
    super();
    this.restrictedActorGroupNames = [];
  }
}
