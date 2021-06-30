import { Column, Entity } from 'typeorm';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';

@Entity()
export class NVP extends BaseAlkemioEntity implements INVP {
  constructor();
  constructor(name: string);
  constructor(name: string, value: string);
  constructor(name?: string, value?: string) {
    super();
    this.name = name || '';
    this.value = value;
  }

  @Column()
  name!: string;

  @Column()
  value?: string;
}
