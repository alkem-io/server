import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IVirtualContributor } from './virtual.contributor.interface';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { Account } from '@domain/space/account/account.entity';
import { BodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualPersona } from '@platform/virtual-persona/virtual.persona.entity';

@Entity()
export class VirtualContributor
  extends ContributorBase
  implements IVirtualContributor
{
  // Note: a many-one without corresponding one-many
  @ManyToOne(() => VirtualPersona, {
    eager: true,
    cascade: true,
  })
  @JoinColumn()
  virtualPersona!: VirtualPersona;

  @ManyToOne(() => Account, account => account.virtualContributors, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  account!: Account;

  @Column({ length: 256 })
  communicationID!: string;

  @Column({ length: 64 })
  bodyOfKnowledgeType!: BodyOfKnowledgeType;

  @Column({ length: 256 })
  bodyOfKnowledgeID!: string;
}
