import { Entity, ManyToOne } from 'typeorm';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Relation } from '@domain/collaboration/relation/relation.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ICollaboration } from './collaboration.interface';

@Entity()
export class Collaboration
  extends AuthorizableEntity
  implements ICollaboration
{
  @ManyToOne(() => Callout, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callouts?: Callout[];

  @ManyToOne(() => Relation, {
    eager: false,
    cascade: true,
  })
  relations?: Relation[];
}
