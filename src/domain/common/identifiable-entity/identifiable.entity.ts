import { BaseCherrytwistEntity } from '@domain/common/base-entity';
import { Column } from 'typeorm';

export abstract class IdentifiableEntity extends BaseCherrytwistEntity {
  @Column()
  name!: string;

  @Column()
  textID!: string;
}
