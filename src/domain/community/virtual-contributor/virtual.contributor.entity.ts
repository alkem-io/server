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
import { ENUM_LENGTH } from '@common/constants';
import { KnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.entity';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';

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

  // Direct reference to AiPersona using aiPersonaID
  @Column('varchar', { nullable: false, length: ENUM_LENGTH })
  aiPersonaID!: string;

  @OneToOne(() => KnowledgeBase, {
    eager: false,
    cascade: true,
    nullable: false,
  })
  @JoinColumn()
  knowledgeBase!: KnowledgeBase;

  @Column()
  listedInStore!: boolean;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  searchVisibility!: SearchVisibility;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Column('simple-array', { nullable: false })
  interactionModes!: VirtualContributorInteractionMode[];

  @Column('text', { nullable: true })
  bodyOfKnowledge?: string;
}
