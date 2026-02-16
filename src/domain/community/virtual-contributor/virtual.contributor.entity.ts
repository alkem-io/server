import { SearchVisibility } from '@common/enums/search.visibility';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { KnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.entity';
import { Account } from '@domain/space/account/account.entity';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { IVirtualContributorPlatformSettings } from '../virtual-contributor-platform-settings/virtual.contributor.platform.settings.interface';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { PromptGraphDefinition } from './dto/prompt-graph-definition/prompt.graph.definition.dto';
import { IVirtualContributor } from './virtual.contributor.interface';

export class VirtualContributor
  extends ContributorBase
  implements IVirtualContributor
{
  rowId!: number;

  account?: Account;

  settings!: IVirtualContributorSettings;

  platformSettings!: IVirtualContributorPlatformSettings;

  // Direct reference to AiPersona using aiPersonaID as potentially in a separate server.
  aiPersonaID!: string;

  bodyOfKnowledgeID?: string;

  promptGraphDefinition?: PromptGraphDefinition;

  listedInStore!: boolean;

  searchVisibility!: SearchVisibility;

  dataAccessMode!: VirtualContributorDataAccessMode;

  interactionModes!: VirtualContributorInteractionMode[];

  bodyOfKnowledgeType!: VirtualContributorBodyOfKnowledgeType;

  knowledgeBase!: KnowledgeBase;

  bodyOfKnowledgeDescription?: string;
}
