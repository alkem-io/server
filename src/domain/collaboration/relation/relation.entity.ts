import { Column, Entity, ManyToOne } from 'typeorm';
import { IRelation } from '@domain/collaboration/relation';
import { Opportunity } from '@domain/collaboration/opportunity';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Relation extends BaseCherrytwistEntity implements IRelation {
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

  @ManyToOne(
    () => Opportunity,
    opportunity => opportunity.relations
  )
  opportunity?: Opportunity;
}
