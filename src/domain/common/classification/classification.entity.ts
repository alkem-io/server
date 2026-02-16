import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { IClassification } from './classification.interface';

export class Classification
  extends AuthorizableEntity
  implements IClassification
{
  tagsets?: Tagset[];
}
