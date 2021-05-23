import { BaseCherrytwistEntity } from '@domain/common/base-entity';
import { Column } from 'typeorm';

export abstract class NameableEntity extends BaseCherrytwistEntity {
  @Column()
  displayName!: string;

  @Column()
  nameID!: string;

  @Column()
  nameableScopeID!: string;

  constructor() {
    super();
    this.nameableScopeID = '';
  }
}
