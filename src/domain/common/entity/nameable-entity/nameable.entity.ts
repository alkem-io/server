import { Column } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

export abstract class NameableEntity extends AuthorizableEntity {
  @Column()
  displayName!: string;

  @Column()
  nameID!: string;

  constructor() {
    super();
  }
}
