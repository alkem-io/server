import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IVirtualContributor } from './virtual.contributor.interface';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { Account } from '@domain/space/account/account.entity';
import { SearchVisibility } from '@common/enums/search.visibility';
import { AiPersona } from '../ai-persona';
import { ENUM_LENGTH } from '@common/constants';
import { KnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.entity';

@Entity()
export class VirtualContributor
  extends ContributorBase
  implements IVirtualContributor
{
  @ManyToOne(() => Account, account => account.virtualContributors, {
    eager: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  account?: Account;

  @OneToOne(() => AiPersona, {
    eager: false,
    cascade: true,
    nullable: false,
  })
  @JoinColumn()
  aiPersona!: AiPersona;

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
}
