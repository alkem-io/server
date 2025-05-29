import { Field, ObjectType } from '@nestjs/graphql';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { ICommunity } from '@domain/community/community';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAccount } from '../account/account.interface';
import { TemplateContentSpaceVisibility } from '@common/enums/templateContentSpace.visibility';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { ILicense } from '@domain/common/license/license.interface';
import { TemplateContentSpaceLevel } from '@common/enums/templateContentSpace.level';
import { ITemplateContentSpaceSettings } from '../templateContentSpace.settings/templateContentSpace.settings.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { ITemplateContentSpaceAbout } from '../templateContentSpace.about/templateContentSpace.about.interface';

@ObjectType('TemplateContentSpace')
export class ITemplateContentSpace extends IAuthorizable {
  rowId!: number;

  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID!: string;

  about!: ITemplateContentSpaceAbout;

  subtemplateContentSpaces?: ITemplateContentSpace[];
  parentTemplateContentSpace?: ITemplateContentSpace;

  account?: IAccount;

  @Field(() => TemplateContentSpaceLevel, {
    description:
      'The level of this TemplateContentSpace, representing the number of TemplateContentSpaces above this one.',
  })
  level!: TemplateContentSpaceLevel;

  @Field(() => TemplateContentSpaceVisibility, {
    description: 'Visibility of the TemplateContentSpace.',
    nullable: false,
  })
  visibility!: TemplateContentSpaceVisibility;

  agent?: IAgent;

  collaboration?: ICollaboration;

  community?: ICommunity;

  settings!: ITemplateContentSpaceSettings;

  storageAggregator?: IStorageAggregator;

  @Field(() => String, {
    description: 'The ID of the level zero templateContentSpace for this tree.',
  })
  levelZeroTemplateContentSpaceID!: string;

  templatesManager?: ITemplatesManager;
  license?: ILicense;
}
