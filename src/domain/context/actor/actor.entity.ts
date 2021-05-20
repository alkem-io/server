import { ActorGroup } from '@domain/context/actor-group/actor-group.entity';
import { IActor } from '@domain/context/actor/actor.interface';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Actor extends BaseCherrytwistEntity implements IActor {
  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('text', { nullable: true })
  value?: string;

  @Column('varchar', { length: 255, nullable: true })
  impact?: string;

  @ManyToOne(
    () => ActorGroup,
    actorGroup => actorGroup.actors
  )
  actorGroup?: ActorGroup;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
