import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { Entity, OneToMany } from 'typeorm';
import { IClassification } from './classification.interface';

@Entity()
export class Classification
  extends AuthorizableEntity
  implements IClassification
{
  @OneToMany(
    () => Tagset,
    tagset => tagset.classification,
    {
      eager: false,
      cascade: true,
    }
  )
  tagsets?: Tagset[];
}
