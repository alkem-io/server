import { BaseCherrytwistEntity } from '@domain/common/base-entity';
import { Column } from 'typeorm';

export abstract class NameableEntity extends BaseCherrytwistEntity {
  @Column()
  displayName!: string;

  @Column()
  nameID!: string;

  constructor() {
    super();
  }
}
