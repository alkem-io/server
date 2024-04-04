import { Column, Entity } from 'typeorm';
import { IVirtual } from './virtual.interface';
import { Contributor } from '../contributor/contributor.entity';

@Entity()
export class Virtual extends Contributor implements IVirtual {
  @Column()
  prompt!: string;

  constructor() {
    super();
  }
}
