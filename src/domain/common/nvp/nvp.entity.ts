import { MID_TEXT_LENGTH } from '@common/constants';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { Column, Entity } from 'typeorm';

@Entity()
export class NVP extends BaseAlkemioEntity implements INVP {
  constructor(name: string, value: string) {
    super();
    this.name = name;
    this.value = value;
  }

  @Column('varchar', { nullable: false, length: MID_TEXT_LENGTH })
  name!: string;

  @Column('varchar', { nullable: false, length: MID_TEXT_LENGTH })
  value!: string;

  @Column('int')
  sortOrder!: number;
}
