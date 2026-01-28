import { ENUM_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { SearchVisibility } from '@common/enums/search.visibility';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { KnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.entity';
import { Account } from '@domain/space/account/account.entity';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { IVirtualContributorPlatformSettings } from '../virtual-contributor-platform-settings/virtual.contributor.platform.settings.interface';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { PromptGraphDefinition } from './dto/prompt-graph-definition/prompt.graph.definition.dto';
import { PromptGraphTransformer } from './transformers/prompt.graph.transformer';
import { IVirtualContributor } from './virtual.contributor.interface';

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

  @ManyToOne(
    () => Account,
    account => account.virtualContributors,
    {
      eager: false,
      onDelete: 'SET NULL',
      nullable: true,
    }
  )
  account?: Account;

  @Column('jsonb', { nullable: false })
  settings!: IVirtualContributorSettings;

  @Column('jsonb', { nullable: false })
  platformSettings!: IVirtualContributorPlatformSettings;

  // Direct reference to AiPersona using aiPersonaID as potentially in a separate server.
  @Column('uuid', { nullable: false })
  aiPersonaID!: string;

  @Column('varchar', { nullable: true, length: SMALL_TEXT_LENGTH })
  bodyOfKnowledgeID?: string;

  @Column('jsonb', { nullable: true, transformer: PromptGraphTransformer })
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
