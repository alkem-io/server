import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { IVirtualContributor } from './virtual.contributor.interface';
import { Contributor } from '../contributor/contributor.entity';
import { VirtualPersona } from '../virtual-persona';

@Entity()
export class VirtualContributor
  extends Contributor
  implements IVirtualContributor
{
  @OneToOne(() => VirtualPersona, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  virtualPersona!: VirtualPersona;

  constructor() {
    super();
  }
}
