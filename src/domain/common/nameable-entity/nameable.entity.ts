import { Column } from 'typeorm';
import { AuthorizableEntity } from '../authorizable-entity';

export abstract class NameableEntity extends AuthorizableEntity {
  @Column()
  displayName!: string;

  @Column()
  nameID!: string;

  constructor() {
    super();
  }
}
