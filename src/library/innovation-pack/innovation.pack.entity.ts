import { SearchVisibility } from '@common/enums/search.visibility';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Account } from '@domain/space/account/account.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { IInnovationPack } from './innovation.pack.interface';

export class InnovationPack extends NameableEntity implements IInnovationPack {
  account?: Account;

  templatesSet?: TemplatesSet;

  listedInStore!: boolean;

  searchVisibility!: SearchVisibility;

  templatesCount = 0;
}
