import { SpaceLevel } from '@common/enums/space.level';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { SpaceAbout } from '@domain/space/space.about/space.about.entity';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { ITemplateContentSpace } from './template.content.space.interface';

export class TemplateContentSpace
  extends AuthorizableEntity
  implements ITemplateContentSpace
{
  rowId!: number;

  subspaces?: TemplateContentSpace[];

  parentSpace?: TemplateContentSpace;

  collaboration?: Collaboration;

  about!: SpaceAbout;

  settings!: ISpaceSettings;

  level!: SpaceLevel;

  // Later: add in application form, community roles, hierarchy so with subspaces etc.
}
