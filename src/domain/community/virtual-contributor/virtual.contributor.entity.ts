import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IVirtualContributor } from './virtual.contributor.interface';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { Account } from '@domain/space/account/account.entity';
import { SearchVisibility } from '@common/enums/search.visibility';
import { ENUM_LENGTH, SMALL_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';
import { KnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.entity';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { IVirtualContributorPlatformSettings } from '../virtual-contributor-platform-settings/virtual.contributor.platform.settings.interface';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { PromptGraphTransformer } from './transformers/prompt.graph.transformer';
import { PromptGraphDefinition } from './dto/prompt-graph-definition/prompt.graph.definition.dto';

@Entity()
export class VirtualContributor
  extends ContributorBase
  implements IVirtualContributor
{
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @ManyToOne(() => Account, account => account.virtualContributors, {
    eager: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  account?: Account;

  @Column('json', { nullable: false })
  settings!: IVirtualContributorSettings;

  @Column('json', { nullable: false })
  platformSettings!: IVirtualContributorPlatformSettings;

  // Direct reference to AiPersona using aiPersonaID as potentially in a separate server.
  @Column('char', { nullable: false, length: UUID_LENGTH })
  aiPersonaID!: string;

  @Column('varchar', { nullable: true, length: SMALL_TEXT_LENGTH })
  bodyOfKnowledgeID?: string;

  @Column('json', { nullable: true, transformer: PromptGraphTransformer })
  promptGraphDefinition?: PromptGraphDefinition;

  @Column()
  listedInStore!: boolean;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  searchVisibility!: SearchVisibility;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Column('simple-array', { nullable: false })
  interactionModes!: VirtualContributorInteractionMode[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  bodyOfKnowledgeType!: VirtualContributorBodyOfKnowledgeType;

  @OneToOne(() => KnowledgeBase, {
    eager: false,
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  knowledgeBase!: KnowledgeBase;

  @Column('text', { nullable: true })
  bodyOfKnowledgeDescription?: string;
}
