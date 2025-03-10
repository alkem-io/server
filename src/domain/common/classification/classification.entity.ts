import { Entity, OneToMany } from 'typeorm';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { IClassification } from './classification.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class Classification
  extends AuthorizableEntity
  implements IClassification
{
  @OneToMany(() => Tagset, tagset => tagset.classification, {
    eager: false,
    cascade: true,
  })
  tagsets?: Tagset[];
}
