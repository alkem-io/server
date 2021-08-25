import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IEcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.interface';
import { ActorGroup } from '@domain/context/actor-group/actor-group.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Canvas } from '@domain/common/canvas';
@Entity()
export class EcosystemModel
  extends AuthorizableEntity
  implements IEcosystemModel
{
  @Column('varchar', { length: 255, nullable: true })
  description?: string = '';

  @OneToMany(() => ActorGroup, actorGroup => actorGroup.ecosystemModel, {
    eager: true,
    cascade: true,
  })
  actorGroups?: ActorGroup[];

  @OneToOne(() => Canvas, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  canvas?: Canvas;

  // The restricted actor group names at the Opportunity level
  restrictedActorGroupNames: string[];

  constructor() {
    super();
    this.restrictedActorGroupNames = [];
  }
}
