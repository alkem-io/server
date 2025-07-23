import { Field, ObjectType } from '@nestjs/graphql';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { ILicense } from '@domain/common/license/license.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';
import { SpaceLevel } from '@common/enums/space.level';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

@ObjectType('TemplateContentSpace')
export class ITemplateContentSpace extends IAuthorizable {
  rowId!: number;

  subspaces?: ITemplateContentSpace[];
  parentSpace?: ITemplateContentSpace;

  about!: ISpaceAbout;

  @Field(() => SpaceLevel, {
    description: 'The level of this TemplateContentSpace',
  })
  level!: SpaceLevel;

  collaboration?: ICollaboration;

  settings!: ISpaceSettings;

  license?: ILicense;
}
