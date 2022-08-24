import { Entity, OneToMany } from 'typeorm';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Relation } from '@domain/collaboration/relation/relation.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';

@Entity()
export class Collaboration
  extends AuthorizableEntity
  implements ICollaboration
{
  @OneToMany(() => Callout, callout => callout.collaboration, {
    eager: false,
    cascade: true,
  })
  callouts?: Callout[];

  @OneToMany(() => Relation, relation => relation.collaboration, {
    eager: false,
    cascade: true,
  })
  relations?: Relation[];
}
