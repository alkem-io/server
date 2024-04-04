import { Column, Entity } from 'typeorm';
import { IVirtualContributor } from './virtual.contributor.interface';
import { Contributor } from '../contributor/contributor.entity';
import { VirtualPersonaType } from '@services/adapters/virtual-persona-adapter/virtual.persona.type';

@Entity()
export class VirtualContributor
  extends Contributor
  implements IVirtualContributor
{
  @Column()
  prompt!: string;

  @Column('text', { nullable: false })
  type!: VirtualPersonaType;

  constructor() {
    super();
  }
}
