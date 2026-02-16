import { TagsetType } from '@common/enums/tagset.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Classification } from '../classification/classification.entity';
import { TagsetTemplate } from '../tagset-template/tagset.template.entity';

export class Tagset extends AuthorizableEntity implements ITagset {
  name!: string;

  type!: TagsetType;

  tags!: string[];

  profile?: Profile;

  classification?: Classification;

  tagsetTemplate?: TagsetTemplate;

  constructor() {
    super();
    this.tags = [];
  }
}
