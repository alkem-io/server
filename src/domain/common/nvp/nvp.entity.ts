import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { INVP } from '@domain/common/nvp/nvp.interface';

export class NVP extends BaseAlkemioEntity implements INVP {
  constructor(name: string, value: string) {
    super();
    this.name = name;
    this.value = value;
  }

  name!: string;

  value!: string;

  sortOrder!: number;
}
