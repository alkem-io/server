import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IVirtualContributor } from './virtual.contributor.interface';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { Account } from '@domain/space/account/account.entity';
import { SearchVisibility } from '@common/enums/search.visibility';
import { AiPersona } from '../ai-persona';

@Entity()
export class VirtualContributor
  extends ContributorBase
  implements IVirtualContributor
{
  @OneToOne(() => AiPersona, {
    eager: true,
    cascade: true,
  })
  @JoinColumn()
  aiPersona!: AiPersona;

  @ManyToOne(() => Account, account => account.virtualContributors, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  account!: Account;

  @Column()
  listedInStore!: boolean;

  @Column({ length: 255, nullable: false })
  communicationID!: string;

  @Column('varchar', {
    length: 36,
    nullable: false,
    default: SearchVisibility.ACCOUNT,
  })
  searchVisibility!: SearchVisibility;
}
