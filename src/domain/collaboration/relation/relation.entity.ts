import { Column, Entity, ManyToOne } from 'typeorm';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Collaboration } from '../collaboration';

@Entity()
export class Relation extends AuthorizableEntity implements IRelation {
  @Column('varchar')
  type = '';

  @Column('varchar')
  actorName = '';

  @Column('varchar')
  actorType = '';

  @Column('varchar')
  actorRole = '';

  @Column('text', { nullable: true })
  description? = '';

  @ManyToOne(() => Collaboration, collaboration => collaboration.relations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  collaboration?: Collaboration;
}
