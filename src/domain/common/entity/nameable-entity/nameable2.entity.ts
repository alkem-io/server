import { Column } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

export abstract class Nameable2Entity extends AuthorizableEntity {
  @Column()
  nameID!: string;

  constructor() {
    super();
  }
}
