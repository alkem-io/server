import {
  Column,
  ChildEntity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IVirtualContributor } from './virtual.contributor.interface';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Account } from '@domain/space/account/account.entity';
import { SearchVisibility } from '@common/enums/search.visibility';
import {
  ENUM_LENGTH,
  NAMEID_MAX_LENGTH_SCHEMA,
  SMALL_TEXT_LENGTH,
} from '@common/constants';
import { KnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.entity';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { IVirtualContributorPlatformSettings } from '@domain/community/virtual-contributor-platform-settings';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { PromptGraphTransformer } from './transformers/prompt.graph.transformer';
import { PromptGraphDefinition } from './dto/prompt-graph-definition/prompt.graph.definition.dto';
import { ActorType } from '@common/enums/actor.type';

@ChildEntity(ActorType.VIRTUAL)
export class VirtualContributor extends Actor implements IVirtualContributor {
  // Override Actor.profile to be non-optional (required for IVirtualContributor)
  declare profile: Profile;

  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
    unique: true,
  })
  nameID!: string;

  // VirtualContributor extends Actor - credentials are on Actor.credentials

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
