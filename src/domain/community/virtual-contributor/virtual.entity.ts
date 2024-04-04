import { Column, Entity } from 'typeorm';
import { IVirtual } from './virtual.interface';
import { Contributor } from '../contributor/contributor.entity';
import { VirtualContributorType } from '@services/adapters/virtual-contributor-adapter/virtual.contributor.type';

@Entity()
export class Virtual extends Contributor implements IVirtual {
  @Column()
  prompt!: string;

  @Column('text', { nullable: false })
  type!: VirtualContributorType;

  constructor() {
    super();
  }
}
