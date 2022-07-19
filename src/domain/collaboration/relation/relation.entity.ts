import { Column, Entity, ManyToOne } from 'typeorm';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
// import { Collaboration } from '../collaboration';

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

  @ManyToOne(() => Opportunity, opportunity => opportunity.relations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  opportunity?: Opportunity;

  // @ManyToOne(() => Collaboration, collaboration => collaboration.relations, {
  //   eager: false,
  //   cascade: false,
  //   onDelete: 'CASCADE',
  // })
  // collaboration?: Collaboration;
}
