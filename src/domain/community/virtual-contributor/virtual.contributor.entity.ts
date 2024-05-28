import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IVirtualContributor } from './virtual.contributor.interface';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { VirtualPersona } from '../virtual-persona';

@Entity()
export class VirtualContributor
  extends ContributorBase
  implements IVirtualContributor
{
  @OneToOne(() => VirtualPersona, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  virtualPersona!: VirtualPersona;

  @Column()
  communicationID: string = '';

  constructor() {
    super();
  }
}
