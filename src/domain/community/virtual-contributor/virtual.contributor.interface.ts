import { Field, ObjectType } from '@nestjs/graphql';
import { IContributorBase } from '../contributor/contributor.base.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { IContributor } from '../contributor/contributor.interface';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IAiPersona } from '@services/ai-server/ai-persona/ai.persona.interface';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';

@ObjectType('VirtualContributor', {
  implements: () => [IContributor],
})
export abstract class IVirtualContributor
  extends IContributorBase
  implements IContributor
{
  rowId!: number;

  account?: IAccount;

  aiPersonaID!: string;

  aiPersona?: IAiPersona;

  knowledgeBase!: IKnowledgeBase;

  @Field(() => SearchVisibility, {
    description: 'Visibility of the VC in searches.',
    nullable: false,
  })
  searchVisibility!: SearchVisibility;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag to control if this VC is listed in the platform store.',
  })
  listedInStore!: boolean;

  @Field(() => IVirtualContributorSettings, {
    nullable: false,
    description: 'The settings of this Virtual Contributor.',
  })
  settings!: IVirtualContributorSettings;
}
