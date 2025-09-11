import { Field, ObjectType } from '@nestjs/graphql';
import { IContributorBase } from '../contributor/contributor.base.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { IContributor } from '../contributor/contributor.interface';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IAiPersona } from '@services/ai-server/ai-persona/ai.persona.interface';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { UUID } from '@domain/common/scalars';

@ObjectType('VirtualContributor', {
  implements: () => [IContributor],
})
export class IVirtualContributor
  extends IContributorBase
  implements IContributor
{
  rowId!: number;

  account?: IAccount;

  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the AI Persona powering this Virtual Contributor.',
  })
  aiPersonaID!: string;

  @Field(() => IAiPersona, {
    description: 'The AI Persona powering this Virtual Contributor.',
    nullable: false,
  })
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
  @Field(() => Markdown, {
    nullable: true,
    description: 'The description for this AI Persona.',
  })
  description?: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'A overview of knowledge provided by this AI Persona.',
  })
  bodyOfKnowledge?: string;

  @Field(() => VirtualContributorDataAccessMode, {
    nullable: false,
    description:
      'The type of context sharing that are supported by this AI Persona when used.',
  })
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Field(() => VirtualContributorInteractionMode, {
    nullable: false,
    description: 'Interaction modes supported by this AI Persona when used.',
  })
  interactionModes!: VirtualContributorInteractionMode[];
}
